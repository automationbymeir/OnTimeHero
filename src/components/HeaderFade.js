import React from 'react';
import { View, ImageBackground, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';

const { height } = Dimensions.get('window');

const HeaderFade = ({ 
  imageUrl, 
  height: fadeHeight = 360, 
  background = '#0b1022', 
  fadeStart = 0.65, 
  method = 'mask' 
}) => {
  if (!imageUrl) {
    return null;
  }

  const fadePosition = fadeHeight * fadeStart;

  if (method === 'overlay') {
    return (
      <View style={[styles.container, { height: fadeHeight }]}>
        <ImageBackground
          source={{ uri: imageUrl }}
          style={styles.imageBackground}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={['transparent', 'transparent', background]}
            locations={[0, fadeStart, 1]}
            style={styles.overlayGradient}
          />
        </ImageBackground>
      </View>
    );
  }

  // Default mask method
  return (
    <View style={[styles.container, { height: fadeHeight }]}>
      <ImageBackground
        source={{ uri: imageUrl }}
        style={styles.imageBackground}
        imageStyle={styles.imageStyle}
      />
      <LinearGradient
        colors={['transparent', 'transparent', background]}
        locations={[0, fadeStart, 1]}
        style={[styles.maskGradient, { height: fadeHeight }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  imageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageStyle: {
    resizeMode: 'cover',
  },
  overlayGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  maskGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
});

export default HeaderFade;





