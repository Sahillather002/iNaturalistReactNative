// @flow
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import { useNavigation } from "@react-navigation/native";
import {
  activateKeepAwake,
  deactivateKeepAwake
} from "@sayem314/react-native-keep-awake";
import { searchObservations } from "api/observations";
import type { Node } from "react";
import React, {
  useCallback, useEffect,
  useMemo, useState
} from "react";
import { EventRegister } from "react-native-event-listeners";
import Observation from "realmModels/Observation";
import ObservationPhoto from "realmModels/ObservationPhoto";
import Photo from "realmModels/Photo";
import fetchPlaceName from "sharedHelpers/fetchPlaceName";
import { formatExifDateAsString, parseExif, writeExifToFile } from "sharedHelpers/parseExif";
import useApiToken from "sharedHooks/useApiToken";
import useCurrentUser from "sharedHooks/useCurrentUser";

import { log } from "../../react-native-logs.config";
import { ObsEditContext, RealmContext } from "./contexts";

const { useRealm } = RealmContext;

type Props = {
  children: any,
};

const logger = log.extend( "ObsEditProvider" );

const ObsEditProvider = ( { children }: Props ): Node => {
  const navigation = useNavigation( );
  const realm = useRealm( );
  const apiToken = useApiToken( );
  const currentUser = useCurrentUser( );
  const [currentObservationIndex, setCurrentObservationIndex] = useState( 0 );
  const [observations, setObservations] = useState( [] );
  const [cameraPreviewUris, setCameraPreviewUris] = useState( [] );
  const [galleryUris, setGalleryUris] = useState( [] );
  const [evidenceToAdd, setEvidenceToAdd] = useState( [] );
  const [originalCameraUrisMap, setOriginalCameraUrisMap] = useState( {} );
  const [cameraRollUris, setCameraRollUris] = useState( [] );
  const [album, setAlbum] = useState( null );
  const [loading, setLoading] = useState( false );
  const [unsavedChanges, setUnsavedChanges] = useState( false );
  const [uploadProgress, setUploadProgress] = useState( { } );
  const [passesEvidenceTest, setPassesEvidenceTest] = useState( false );
  const [passesIdentificationTest, setPassesIdentificationTest] = useState( false );
  const [mediaViewerUris, setMediaViewerUris] = useState( [] );
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState( 0 );
  const [groupedPhotos, setGroupedPhotos] = useState( [] );

  const resetObsEditContext = useCallback( ( ) => {
    setObservations( [] );
    setCurrentObservationIndex( 0 );
    setCameraPreviewUris( [] );
    setOriginalCameraUrisMap( {} );
    setGalleryUris( [] );
    setEvidenceToAdd( [] );
    setCameraRollUris( [] );
    setUnsavedChanges( false );
    setPassesEvidenceTest( false );
    setGroupedPhotos( [] );
  }, [] );

  useEffect( () => {
    const progressListener = EventRegister.addEventListener(
      "INCREMENT_OBSERVATIONS_PROGRESS",
      increments => {
        setUploadProgress( currentProgress => {
          increments.forEach( ( [uuid, increment] ) => {
            currentProgress[uuid] = currentProgress[uuid]
              ? currentProgress[uuid]
              : 0;
            currentProgress[uuid] += increment;
          } );
          return { ...currentProgress };
        } );
      }
    );
    return () => {
      EventRegister.removeEventListener( progressListener );
    };
  }, [] );

  const allObsPhotoUris = useMemo(
    ( ) => [...cameraPreviewUris, ...galleryUris],
    [cameraPreviewUris, galleryUris]
  );

  const currentObservation = observations[currentObservationIndex];

  const addSound = async ( ) => {
    const newObservation = await Observation.createObsWithSounds( );
    setObservations( [newObservation] );
  };

  const addObservations = async obs => setObservations( obs );

  const createObservationNoEvidence = async ( ) => {
    const newObservation = await Observation.new( );
    setObservations( [newObservation] );
  };

  const createObsPhotos = useCallback(
    async photos => Promise.all(
      photos.map( async photo => ObservationPhoto.new( photo?.image?.uri ) )
    ),
    []
  );

  const createObservationFromGalleryPhoto = useCallback( async photo => {
    const firstPhotoExif = await parseExif( photo?.image?.uri );
    logger.info( `EXIF: ${JSON.stringify( firstPhotoExif, null, 2 )}` );

    const { latitude, longitude } = firstPhotoExif;
    const placeGuess = await fetchPlaceName( latitude, longitude );

    const newObservation = {
      latitude,
      longitude,
      place_guess: placeGuess,
      observed_on_string: formatExifDateAsString( firstPhotoExif.date ) || null
    };

    if ( firstPhotoExif.positional_accuracy ) {
      // $FlowIgnore
      newObservation.positional_accuracy = firstPhotoExif.positional_accuracy;
    }
    return Observation.new( newObservation );
  }, [] );

  const createObservationsFromGroupedPhotos = useCallback( async groupedPhotoObservations => {
    const newObservations = await Promise.all( groupedPhotoObservations.map(
      async ( { photos } ) => {
        const firstPhoto = photos[0];
        const newLocalObs = await createObservationFromGalleryPhoto( firstPhoto );
        newLocalObs.observationPhotos = await createObsPhotos( photos );
        return newLocalObs;
      }
    ) );
    setObservations( newObservations );
  }, [createObsPhotos, createObservationFromGalleryPhoto] );

  const createObservationFromGallery = useCallback( async photo => {
    const newLocalObs = await createObservationFromGalleryPhoto( photo );
    newLocalObs.observationPhotos = await createObsPhotos( [photo] );
    setObservations( [newLocalObs] );
  }, [createObsPhotos, createObservationFromGalleryPhoto] );

  const appendObsPhotos = useCallback( obsPhotos => {
    // need empty case for when a user creates an observation with no photos,
    // then tries to add photos to observation later
    const currentObservationPhotos = currentObservation?.observationPhotos || [];

    const updatedObs = currentObservation;
    updatedObs.observationPhotos = [...currentObservationPhotos, ...obsPhotos];
    setObservations( [updatedObs] );
    // clear additional evidence
    setEvidenceToAdd( [] );
    setUnsavedChanges( true );
  }, [currentObservation] );

  const addGalleryPhotosToCurrentObservation = useCallback( async photos => {
    const obsPhotos = await createObsPhotos( photos );
    appendObsPhotos( obsPhotos );
  }, [createObsPhotos, appendObsPhotos] );

  const uploadValue = useMemo( ( ) => {
    // Save URIs to camera gallery (if a photo was taken using the app,
    // we want it accessible in the camera's folder, as if the user has taken those photos
    // via their own camera app).
    const savePhotosToCameraGallery = async uris => {
      const savedUris = await Promise.all( uris.map( async uri => {
        // Find original camera URI of each scaled-down photo
        const cameraUri = originalCameraUrisMap[uri];

        if ( !cameraUri ) {
          console.error( `Couldn't find original camera URI for: ${uri}` );
        }
        logger.info( "savePhotosToCameraGallery, saving cameraUri: ", cameraUri );
        return CameraRoll.save( cameraUri, { type: "photo", album: "Camera" } );
      } ) );

      logger.info( "savePhotosToCameraGallery, savedUris: ", savedUris );
      // Save these camera roll URIs, so later on observation editor can update
      // the EXIF metadata of these photos, once we retrieve a location.
      setCameraRollUris( savedUris );
    };

    const writeExifToCameraRollPhotos = async exif => {
      if ( !cameraRollUris || cameraRollUris.length === 0 || !currentObservation ) {
        return;
      }
      // Update all photos taken via the app with the new fetched location.
      cameraRollUris.forEach( uri => {
        logger.info( "writeExifToCameraRollPhotos, writing exif for uri: ", uri );
        writeExifToFile( uri, exif );
      } );
    };

    const createObsWithCameraPhotos = async localFilePaths => {
      const newObservation = await Observation.new( );
      const obsPhotos = await Promise.all( localFilePaths.map(
        async photo => ObservationPhoto.new( photo )
      ) );
      newObservation.observationPhotos = obsPhotos;
      setObservations( [newObservation] );
      logger.info(
        "createObsWithCameraPhotos, calling savePhotosToCameraGallery with paths: ",
        localFilePaths
      );
      await savePhotosToCameraGallery( localFilePaths );
    };

    const addCameraPhotosToCurrentObservation = async localFilePaths => {
      const obsPhotos = await Promise.all( localFilePaths.map(
        async photo => ObservationPhoto.new( photo )
      ) );
      appendObsPhotos( obsPhotos );
      logger.info(
        "addCameraPhotosToCurrentObservation, calling savePhotosToCameraGallery with paths: ",
        localFilePaths
      );
      await savePhotosToCameraGallery( localFilePaths );
    };

    const updateObservationKeys = keysAndValues => {
      const updatedObservations = observations;
      const obsToUpdate = observations[currentObservationIndex];
      const isSavedObservation = realm.objectForPrimaryKey( "Observation", obsToUpdate.uuid );
      const updatedObservation = {
        ...( obsToUpdate.toJSON
          ? obsToUpdate.toJSON( )
          : obsToUpdate ),
        ...keysAndValues
      };
      if ( isSavedObservation && !unsavedChanges ) {
        setUnsavedChanges( true );
      }
      updatedObservations[currentObservationIndex] = updatedObservation;
      setObservations( [...updatedObservations] );
    };

    const setNextScreen = ( ) => {
      if ( observations.length === 1 ) {
        setCurrentObservationIndex( 0 );
        setObservations( [] );

        navigation.navigate( "ObsList" );
      } else if ( currentObservationIndex === observations.length - 1 ) {
        observations.pop( );
        setCurrentObservationIndex( observations.length - 1 );
        setObservations( observations );
      } else {
        observations.splice( currentObservationIndex, 1 );
        setCurrentObservationIndex( currentObservationIndex );
        // this seems necessary for rerendering the ObsEdit screen
        setObservations( [] );
        setObservations( observations );
      }
    };

    const deleteLocalObservation = uuid => {
      realm?.write( ( ) => {
        realm?.delete( realm.objectForPrimaryKey( "Observation", uuid ) );
      } );
    };

    function ensureRealm( ) {
      if ( !realm ) {
        throw new Error( "Gack, tried to save an observation without realm!" );
      }
    }

    const saveObservation = async observation => {
      ensureRealm( );
      await writeExifToCameraRollPhotos( {
        latitude: observation.latitude,
        longitude: observation.longitude,
        positional_accuracy: observation.positionalAccuracy
      } );
      return Observation.saveLocalObservationForUpload( observation, realm );
    };

    const saveCurrentObservation = async ( ) => saveObservation( currentObservation );

    const saveAllObservations = async ( ) => {
      ensureRealm( );
      setLoading( true );
      await Promise.all( observations.map( async observation => {
        // Note that this should only happen after import when ObsEdit has
        // multiple observations to save, none of which should have
        // corresponding photos in cameraRollPhotos, so there's no need to
        // write EXIF for those.
        await Observation.saveLocalObservationForUpload( observation, realm );
      } ) );
      setLoading( false );
    };

    const uploadObservation = async observation => {
      // don't bother trying to upload unless there's a logged in user
      if ( !currentUser ) { return {}; }
      if ( !apiToken ) {
        throw new Error(
          "Gack, tried to upload an observation without API token!"
        );
      }
      activateKeepAwake();
      const response = Observation.uploadObservation(
        observation,
        apiToken,
        realm
      );
      deactivateKeepAwake();
      return response;
    };

    const saveAndUploadObservation = async ( ) => {
      const savedObservation = await saveCurrentObservation( );
      return uploadObservation( savedObservation );
    };

    const removePhotoFromList = ( list, photo ) => {
      const i = list.findIndex( p => p === photo );
      list.splice( i, 1 );
      return list;
    };

    const deleteObservationPhoto = ( list, photo ) => {
      const i = list.findIndex(
        p => p.photo.localFilePath === photo || p.originalPhotoUri === photo
      );
      list.splice( i, 1 );
      return list;
    };

    const deletePhotoFromObservation = async photoUriToDelete => {
      // photos displayed in EvidenceList
      const updatedObs = currentObservation;
      if ( updatedObs ) {
        const obsPhotos = Array.from( currentObservation?.observationPhotos );
        if ( obsPhotos.length > 0 ) {
          const updatedObsPhotos = deleteObservationPhoto( obsPhotos, photoUriToDelete );
          updatedObs.observationPhotos = updatedObsPhotos;
          setObservations( [updatedObs] );
        }
      }

      // photos to show in media viewer
      const newMediaViewerUris = removePhotoFromList( mediaViewerUris, photoUriToDelete );
      setMediaViewerUris( [...newMediaViewerUris] );

      // photos displayed in PhotoPreview
      const newCameraPreviewUris = removePhotoFromList( cameraPreviewUris, photoUriToDelete );
      setCameraPreviewUris( [...newCameraPreviewUris] );

      // when deleting photo from StandardCamera while adding new evidence, remember to clear
      // the list of new evidence to add
      if ( evidenceToAdd.length > 0 ) {
        const updatedEvidence = removePhotoFromList( evidenceToAdd, photoUriToDelete );
        setEvidenceToAdd( [...updatedEvidence] );
      }

      await Photo.deletePhoto( realm, photoUriToDelete );
    };

    const startSingleUpload = async observation => {
      setLoading( true );
      const { uuid } = observation;
      setUploadProgress( {
        ...uploadProgress,
        [uuid]: 0.5
      } );
      const response = await uploadObservation( observation );
      if ( Object.keys( response ).length === 0 ) {
        return;
      }
      // TODO: mostly making sure UI presentation works at the moment, but we will
      // need to figure out what counts as progress towards an observation uploading
      // and add that functionality.
      // maybe uploading an observation is 0.33, starting to upload photos is 0.5,
      // checking for sounds is 0.66 progress?
      // and we need a way to track this progress from the Observation.uploadObservation function

      setLoading( false );
      setUploadProgress( {
        ...uploadProgress,
        [uuid]: 1
      } );
    };

    const downloadRemoteObservationsFromServer = async ( ) => {
      const params = {
        user_id: currentUser?.id,
        per_page: 50,
        fields: Observation.FIELDS
      };
      const results = await searchObservations( params, { api_token: apiToken } );

      Observation.upsertRemoteObservations( results, realm );
    };

    const syncObservations = async ( ) => {
      // TODO: GET observation/deletions once this is enabled in API v2
      activateKeepAwake( );
      setLoading( true );
      await downloadRemoteObservationsFromServer( );
      // we at least want to keep the device awake while uploads are happening
      // not sure about downloads/deletions
      deactivateKeepAwake( );
      setLoading( false );
    };

    return {
      createObservationNoEvidence,
      addObservations,
      createObsWithCameraPhotos,
      addSound,
      currentObservation,
      currentObservationIndex,
      observations,
      setCurrentObservationIndex,
      setObservations,
      updateObservationKeys,
      cameraPreviewUris,
      setCameraPreviewUris,
      galleryUris,
      setGalleryUris,
      allObsPhotoUris,
      createObservationsFromGroupedPhotos,
      addGalleryPhotosToCurrentObservation,
      createObservationFromGallery,
      evidenceToAdd,
      setEvidenceToAdd,
      addCameraPhotosToCurrentObservation,
      resetObsEditContext,
      saveCurrentObservation,
      saveAndUploadObservation,
      deleteLocalObservation,
      album,
      setAlbum,
      deletePhotoFromObservation,
      uploadObservation,
      setNextScreen,
      loading,
      setLoading,
      unsavedChanges,
      syncObservations,
      startSingleUpload,
      uploadProgress,
      setUploadProgress,
      saveAllObservations,
      setPassesEvidenceTest,
      passesEvidenceTest,
      passesIdentificationTest,
      setPassesIdentificationTest,
      mediaViewerUris,
      setMediaViewerUris,
      selectedPhotoIndex,
      setSelectedPhotoIndex,
      groupedPhotos,
      setGroupedPhotos,
      originalCameraUrisMap,
      setOriginalCameraUrisMap
    };
  }, [
    currentObservation,
    currentObservationIndex,
    observations,
    cameraPreviewUris,
    galleryUris,
    allObsPhotoUris,
    createObservationsFromGroupedPhotos,
    addGalleryPhotosToCurrentObservation,
    createObservationFromGallery,
    evidenceToAdd,
    setEvidenceToAdd,
    resetObsEditContext,
    apiToken,
    navigation,
    realm,
    album,
    setAlbum,
    loading,
    setLoading,
    unsavedChanges,
    currentUser,
    uploadProgress,
    passesEvidenceTest,
    passesIdentificationTest,
    mediaViewerUris,
    selectedPhotoIndex,
    groupedPhotos,
    setOriginalCameraUrisMap,
    originalCameraUrisMap,
    appendObsPhotos,
    cameraRollUris
  ] );

  return (
    <ObsEditContext.Provider value={uploadValue}>
      {children}
    </ObsEditContext.Provider>
  );
};

export default ObsEditProvider;
