// @flow

import MediaViewerModal from "components/MediaViewer/MediaViewerModal";
import type { Node } from "react";
import React, {
  useCallback,
  useState
} from "react";
import ObservationPhoto from "realmModels/ObservationPhoto";
import useStore from "stores/useStore";

import useObservers from "./hooks/useObservers";
import useOfflineSuggestions from "./hooks/useOfflineSuggestions";
import useOnlineSuggestions from "./hooks/useOnlineSuggestions";
import useTaxonSelected from "./hooks/useTaxonSelected";
import Suggestions from "./Suggestions";

const SuggestionsContainer = ( ): Node => {
  const currentObservation = useStore( state => state.currentObservation );
  const innerPhotos = ObservationPhoto.mapInnerPhotos( currentObservation );
  const photoUris = ObservationPhoto.mapObsPhotoUris( currentObservation );
  const [selectedPhotoUri, setSelectedPhotoUri] = useState( photoUris[0] );
  const [selectedTaxon, setSelectedTaxon] = useState( null );
  const [mediaViewerVisible, setMediaViewerVisible] = useState( false );

  const {
    dataUpdatedAt: onlineSuggestionsUpdatedAt,
    error: onlineSuggestionsError,
    onlineSuggestions,
    loadingOnlineSuggestions,
    timedOut
  } = useOnlineSuggestions( selectedPhotoUri, {
    latitude: currentObservation?.latitude,
    longitude: currentObservation?.longitude
  } );

  // skip to offline suggestions if internet connection is spotty
  const tryOfflineSuggestions = timedOut || (
    // Don't try offline while online is loading
    !loadingOnlineSuggestions
    && (
      // Don't bother with offline if we have some online suggestions
      !onlineSuggestions
      || onlineSuggestions?.results?.length === 0
    )
  );
  const {
    offlineSuggestions,
    loadingOfflineSuggestions
  } = useOfflineSuggestions( selectedPhotoUri, {
    tryOfflineSuggestions
  } );

  const suggestions = onlineSuggestions?.results?.length > 0
    ? onlineSuggestions.results
    : offlineSuggestions;

  const topSuggestion = onlineSuggestions?.common_ancestor;

  const taxonIds = suggestions?.map(
    suggestion => suggestion.taxon.id
  );

  const observers = useObservers( taxonIds );

  useTaxonSelected( selectedTaxon, { vision: true } );

  const loadingSuggestions = ( loadingOnlineSuggestions || loadingOfflineSuggestions )
    && photoUris.length > 0;

  const onPressPhoto = useCallback(
    uri => {
      if ( uri === selectedPhotoUri ) {
        setMediaViewerVisible( true );
      }
      setSelectedPhotoUri( uri );
    },
    [selectedPhotoUri]
  );

  return (
    <>
      <Suggestions
        loadingSuggestions={loadingSuggestions}
        topSuggestion={topSuggestion}
        suggestions={suggestions}
        onTaxonChosen={setSelectedTaxon}
        photoUris={photoUris}
        selectedPhotoUri={selectedPhotoUri}
        onPressPhoto={onPressPhoto}
        observers={observers}
        usingOfflineSuggestions={
          tryOfflineSuggestions && offlineSuggestions?.length > 0
        }
        debugData={{
          timedOut,
          onlineSuggestions,
          offlineSuggestions,
          onlineSuggestionsError,
          onlineSuggestionsUpdatedAt,
          selectedPhotoUri
        }}
      />
      <MediaViewerModal
        showModal={mediaViewerVisible}
        onClose={() => setMediaViewerVisible( false )}
        uri={selectedPhotoUri}
        photos={innerPhotos}
      />
    </>
  );
};

export default SuggestionsContainer;
