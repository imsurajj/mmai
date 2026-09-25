import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/theme/colors';
import { Image } from 'expo-image';
import * as ExpoSplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type SplashScreenProps = {
  onFinish: () => void;
};

export function SplashScreenView({ onFinish }: SplashScreenProps) {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(12);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    // Hide the native splash screen as soon as component mounts
    ExpoSplashScreen.hideAsync().catch(() => {});

    // Logo entrance animation
    opacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) });
    scale.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.back(1.5)) });

    // App name and tagline entrance
    textOpacity.value = withDelay(
      250,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) })
    );
    textTranslateY.value = withDelay(
      250,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) })
    );

    // Fade out splash overlay after display duration
    overlayOpacity.value = withDelay(
      1500,
      withTiming(0, { duration: 450, easing: Easing.inOut(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      })
    );
  }, [onFinish, opacity, overlayOpacity, scale, textOpacity, textTranslateY]);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: palette.background },
        containerAnimStyle,
      ]}
    >
      <View style={styles.centerWrap}>
        {/* App Logo */}
        <Animated.View style={[styles.logoWrap, logoAnimStyle]}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logoImage}
            contentFit="cover"
            transition={200}
          />
        </Animated.View>

        {/* App Name & Tagline */}
        <Animated.View style={[styles.textWrap, textAnimStyle]}>
          <Text style={[styles.appName, { color: palette.text }]}>MMAI</Text>
          <Text style={[styles.appTagline, { color: palette.textMuted }]}>
            Medical & Movement AI
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 104,
    height: 104,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  textWrap: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  appTagline: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
