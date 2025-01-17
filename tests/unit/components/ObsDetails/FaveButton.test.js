import FaveButton from "components/ObsDetails/FaveButton";
import React from "react";
import factory from "tests/factory";
import { renderComponent } from "tests/helpers/render";

describe( "FaveButton", () => {
  it( "should survive no currentUser", ( ) => {
    expect(
      ( ) => renderComponent(
        <FaveButton
          observation={factory( "LocalObservation" )}
        />
      )
    ).not.toThrow( );
  } );

  it( "should survive no currentUser for an observation w/ existing faves", ( ) => {
    const observation = factory( "RemoteObservation", {
      faves: [factory( "RemoteVote" )]
    } );
    expect(
      ( ) => renderComponent(
        <FaveButton
          observation={observation}
        />
      )
    ).not.toThrow( );
  } );
} );
