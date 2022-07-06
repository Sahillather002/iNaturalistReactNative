// @flow strict-local

import { StyleSheet } from "react-native";

import type { ViewStyleProp, TextStyleProp, ImageStyleProp } from "react-native/Libraries/StyleSheet/StyleSheet";
import { colors } from "../global";

const viewStyles: { [string]: ViewStyleProp } = StyleSheet.create( {
  toggleViewRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-around",
    marginVertical: 20
  },
  cardContainer: {
    width: "90%",
    maxWidth: 260,
    height: 300,
    alignSelf: "center"
  },
  card: {
    position: "absolute",
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 260,
    height: 300,
    shadowColor: colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 1,
    borderRadius: 20
  }
} );

const textStyles: { [string]: TextStyleProp } = StyleSheet.create( {
  commonNameText: {
    position: "absolute",
    bottom: 40,
    margin: 10,
    color: "#fff",
    backgroundColor: colors.black
  },
  text: {
    position: "absolute",
    bottom: 0,
    margin: 10,
    color: "#fff",
    backgroundColor: colors.black
  }
} );

const imageStyles: { [string]: ImageStyleProp } = StyleSheet.create( {
  cardImage: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    borderRadius: 20
  }
} );

export {
  viewStyles,
  textStyles,
  imageStyles
};