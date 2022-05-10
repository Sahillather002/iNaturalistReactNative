// @flow

const sortByTime = array => array.sort( ( a, b ) => b.timestamp - a.timestamp );

const orderByTimestamp = ( albums, selectedPhotos ) => {
  let unorderedPhotos = [];
  albums.forEach( album => {
    unorderedPhotos = unorderedPhotos.concat( selectedPhotos[album] );
  } );

  // sort photos from all albums by time
  const ordered = sortByTime( unorderedPhotos );

  // nest under photos
  return ordered.map( photo => {
    return {
      photos: [photo]
    };
  } );
};

const flattenAndOrderSelectedPhotos = ( selectedObservations ) => {
  // combine selected observations into a single array
  let combinedPhotos = [];
  selectedObservations.forEach( obs => {
    combinedPhotos = combinedPhotos.concat( obs.photos );
  } );

  // sort selected observations by timestamp and avoid duplicates
  return [...new Set( sortByTime( combinedPhotos ) ) ];
};

export {
  orderByTimestamp,
  flattenAndOrderSelectedPhotos
};
