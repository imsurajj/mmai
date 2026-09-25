import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Onboarding, type OnboardingStep } from '@/components/ui/onboarding';
import { Text } from '@/components/ui/text';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

function AnimatedEmoji({ emoji, delay = 0 }: { emoji: string; delay?: number }) {
  const scale = useSharedValue(0.3);
  const rotate = useSharedValue(-8);

  useEffect(() => {
    // Entrance: pop-in bounce
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.15, { duration: 400, easing: Easing.out(Easing.back(3)) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        // Idle: gentle breathing pulse
        withRepeat(
          withSequence(
            withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      )
    );

    // Subtle wiggle
    rotate.value = withDelay(
      delay + 500,
      withRepeat(
        withSequence(
          withTiming(6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(-6, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, [delay, rotate, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <View style={styles.emojiWrap}>
      <Animated.View style={animStyle}>
        <Text style={styles.emojiText}>{emoji}</Text>
      </Animated.View>
    </View>
  );
}

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to MMAI',
    description:
      'A focused workspace for training, tracking, and understanding your performance.',
    icon: <AnimatedEmoji emoji="🧠" delay={0} />,
  },
  {
    id: 'insights',
    title: 'See the whole picture',
    description:
      'Charts, sessions, and notes stay in one place so you can spot patterns without extra setup.',
    icon: <AnimatedEmoji emoji="📊" delay={100} />,
  },
  {
    id: 'ready',
    title: 'You are in control',
    description:
      'Your health data stays securely on your device with complete privacy and control.',
    icon: <AnimatedEmoji emoji="🛡️" delay={200} />,
  },
];

type AppOnboardingProps = {
  onComplete: () => void;
};

export function AppOnboarding({ onComplete }: AppOnboardingProps) {
  return (
    <Onboarding
      steps={steps}
      onComplete={onComplete}
      showSkip={false}
      primaryButtonText="Get started"
      nextButtonText="Next"
      backButtonText="Back"
    />
  );
}

const styles = StyleSheet.create({
  emojiWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 90,
    lineHeight: 110,
    textAlign: 'center',
  },
});
