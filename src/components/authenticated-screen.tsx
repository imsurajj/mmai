import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/useColor';
import { LogOut, ShieldCheck, User } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AuthenticatedScreenProps = {
  onLogout: () => void;
};

export function AuthenticatedScreen({ onLogout }: AuthenticatedScreenProps) {
  const bg = useColor('background');
  const card = useColor('card');
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const border = useColor('border');
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.content}>
        {/* Status Icon */}
        <View style={[styles.avatarWrap, { backgroundColor: primary + '18', borderColor: primary + '30' }]}>
          <ShieldCheck size={40} color={primary} />
        </View>

        {/* Access Granted Info */}
        <View style={[styles.statusBadge, { backgroundColor: primary + '15', borderColor: primary + '30' }]}>
          <View style={[styles.statusDot, { backgroundColor: primary }]} />
          <Text style={[styles.statusText, { color: primary }]}>Access Granted • Logged In</Text>
        </View>

        <Text style={[styles.title, { color: text }]}>Welcome to MMAI</Text>
        <Text style={[styles.subtitle, { color: muted }]}>
          Your workspace is active and ready. All template code has been removed.
        </Text>

        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: card, borderColor: border }]}>
          <View style={[styles.userIconCircle, { backgroundColor: primary + '20' }]}>
            <User size={20} color={primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: text }]}>Authenticated User</Text>
            <Text style={[styles.userRole, { color: muted }]}>Session Active</Text>
          </View>
        </View>

        {/* Logout Button */}
        <Button
          variant="default"
          size="lg"
          onPress={onLogout}
          icon={LogOut}
          style={styles.logoutButton}
        >
          Log Out
        </Button>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 28,
    gap: 14,
  },
  userIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userRole: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    width: '100%',
    height: 54,
    borderRadius: 27,
  },
});
