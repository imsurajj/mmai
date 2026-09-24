import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/useColor';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  Heart,
  Lock,
  Mail,
  User,
  X,
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

type AuthMode = 'login' | 'select-role' | 'register';
type UserRole = 'patient' | 'doctor';

type AuthScreenProps = {
  onComplete: () => void;
};

/* Vector Switch Icon */
function SwitchIcon({ size = 12, color = '#D97757' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 3 4 7l4 4" />
      <Path d="M4 7h16" />
      <Path d="m16 21 4-4-4-4" />
      <Path d="M20 17H4" />
    </Svg>
  );
}

/* ---------------- Form Field with External Label ---------------- */
interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  secureTextEntry?: boolean;
  rightAction?: React.ReactNode;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  returnKeyType?: 'next' | 'done';
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  icon: IconComponent,
  secureTextEntry = false,
  rightAction,
  keyboardType = 'default',
  autoCapitalize = 'none',
  onSubmitEditing,
  inputRef,
  returnKeyType = 'next',
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const cardColor = useColor('card');
  const textColor = useColor('text');
  const mutedColor = useColor('textMuted');
  const primaryColor = useColor('primary');
  const borderColor = useColor('border');

  return (
    <View style={styles.fieldGroup}>
      {/* Label OUTSIDE the input container */}
      <Text style={[styles.fieldLabel, { color: textColor }]}>{label}</Text>

      <Pressable
        style={[
          styles.fieldInputContainer,
          {
            backgroundColor: cardColor,
            borderColor: isFocused ? primaryColor : borderColor,
          },
        ]}
        onPress={() => inputRef?.current?.focus()}
      >
        <View style={styles.fieldIconWrap}>
          <IconComponent size={20} color={isFocused ? primaryColor : mutedColor} />
        </View>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={mutedColor + '80'}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          selectionColor={primaryColor}
          style={[
            styles.fieldTextInput,
            { color: textColor },
            Platform.OS === 'web'
              ? ({ outlineStyle: 'none', outlineWidth: 0, borderWidth: 0 } as any)
              : null,
          ]}
        />

        {rightAction && <View style={styles.fieldRightWrap}>{rightAction}</View>}
      </Pressable>
    </View>
  );
}

/* ---------------- Main Auth Screen ---------------- */
export function AuthScreen({ onComplete }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<UserRole>('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);

  const primary = useColor('primary');
  const text = useColor('text');
  const muted = useColor('textMuted');
  const card = useColor('card');
  const border = useColor('border');
  const insets = useSafeAreaInsets();

  const isLogin = mode === 'login';
  const isSelectRole = mode === 'select-role';
  const isRegister = mode === 'register';

  const toggleRole = () => {
    setRole((prev) => (prev === 'patient' ? 'doctor' : 'patient'));
  };

  const handleBack = () => {
    if (isRegister) {
      setMode('select-role');
    } else if (isSelectRole) {
      setMode('login');
    }
  };

  const handleSubmit = () => {
    onComplete();
  };

  return (
    <View style={styles.screen}>
      {/* Background Image filling full page */}
      <Image
        source={{
          uri: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop',
        }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={300}
      />

      {/* Atmospheric Dark Gradient Scrim across full screen */}
      <LinearGradient
        colors={[
          'rgba(13, 15, 18, 0.78)',
          'rgba(13, 15, 18, 0.90)',
          '#0D0F12',
        ]}
        locations={[0, 0.5, 0.9]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 16, // Tasteful margin gap from top
              paddingBottom: insets.bottom + 80, // Comfortable scroll room while typing
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={true}
          scrollEnabled={true}
        >
          {/* ======================================================== */}
          {/* TOP SECTION: BACK BUTTON & SWITCHER                      */}
          {/* ======================================================== */}
          <View style={styles.topNavBar}>
            {/* Left: Back button if in role selection or register */}
            {!isLogin ? (
              <Pressable
                onPress={handleBack}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.navBackButton,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <ChevronLeft size={20} color={muted} />
                <Text style={[styles.navBackText, { color: muted }]}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.navPlaceholder} />
            )}

            {/* Right: Switcher Badge or Mode Switch */}
            {isRegister ? (
              <Pressable
                style={[
                  styles.topRightRoleBadge,
                  {
                    backgroundColor: primary + '18',
                    borderColor: primary + '40',
                  },
                ]}
                onPress={toggleRole}
                hitSlop={8}
              >
                {role === 'patient' ? (
                  <User size={13} color={primary} />
                ) : (
                  <Heart size={13} color={primary} />
                )}
                <Text style={[styles.topRightRoleText, { color: primary }]}>
                  {role === 'patient' ? 'Patient' : 'Doctor'}
                </Text>
                <SwitchIcon size={12} color={primary} />
              </Pressable>
            ) : isSelectRole ? (
              <Pressable onPress={() => setMode('login')} hitSlop={8}>
                <Text style={[styles.navSwitchLink, { color: primary }]}>Sign in</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setMode('select-role')} hitSlop={8}>
                <Text style={[styles.navSwitchLink, { color: primary }]}>Sign up</Text>
              </Pressable>
            )}
          </View>

          {/* Clean Horizontal Divider */}
          <View style={[styles.navDivider, { backgroundColor: border + '38' }]} />

          {/* ======================================================== */}
          {/* ALL OPTIONS BELOW DIVIDER                                */}
          {/* ======================================================== */}
          {isSelectRole ? (
            /* STEP 1: PRE-SIGNUP ROLE SELECTION */
            <Animated.View entering={FadeInDown.duration(350)} style={styles.fullPageContainer}>
              <View style={styles.headerWrap}>
                <View style={styles.badgePill}>
                  <Text style={[styles.badgeText, { color: primary }]}>
                    STEP 1 OF 2 • PROFILE
                  </Text>
                </View>

                <Text style={[styles.headerTitle, { color: text }]}>
                  Choose your role
                </Text>

                <Text style={[styles.headerSubtitle, { color: muted }]}>
                  Select how you plan to use MMAI to personalize your experience
                </Text>
              </View>

              {/* Role Selection Cards (Logo on left, profile name directly at right of logo, no numbering) */}
              <View style={styles.roleCardsContainer}>
                {/* Option: Patient */}
                <Pressable
                  style={[
                    styles.roleCardBig,
                    {
                      backgroundColor: card,
                      borderColor: role === 'patient' ? primary : border,
                      borderWidth: role === 'patient' ? 2 : 1,
                    },
                  ]}
                  onPress={() => setRole('patient')}
                >
                  <View style={styles.roleCardHeaderRow}>
                    {/* Logo on left */}
                    <View
                      style={[
                        styles.roleCardIconCircle,
                        {
                          backgroundColor:
                            role === 'patient' ? primary + '25' : border + '30',
                        },
                      ]}
                    >
                      <User
                        size={22}
                        color={role === 'patient' ? primary : muted}
                      />
                    </View>

                    {/* Profile Name at right of logo (NO NUMBERING) */}
                    <View style={styles.roleCardTitleWrap}>
                      <Text
                        style={[
                          styles.roleCardTitle,
                          { color: role === 'patient' ? primary : text },
                        ]}
                      >
                        Patient
                      </Text>
                      <Text style={[styles.roleCardTypeTag, { color: muted }]}>
                        Personal Health & Recovery
                      </Text>
                    </View>

                    {/* Radio indicator on far right */}
                    <View
                      style={[
                        styles.roleRadioCircle,
                        {
                          borderColor: role === 'patient' ? primary : border,
                          backgroundColor:
                            role === 'patient' ? primary : 'transparent',
                        },
                      ]}
                    >
                      {role === 'patient' && <Check size={12} color="#FAF9F5" />}
                    </View>
                  </View>

                  <Text style={[styles.roleCardDesc, { color: muted }]}>
                    Track recovery, log daily vitals, and optimize personal athletic performance.
                  </Text>
                </Pressable>

                {/* Option: Doctor or Caretaker */}
                <Pressable
                  style={[
                    styles.roleCardBig,
                    {
                      backgroundColor: card,
                      borderColor: role === 'doctor' ? primary : border,
                      borderWidth: role === 'doctor' ? 2 : 1,
                    },
                  ]}
                  onPress={() => setRole('doctor')}
                >
                  <View style={styles.roleCardHeaderRow}>
                    {/* Logo on left */}
                    <View
                      style={[
                        styles.roleCardIconCircle,
                        {
                          backgroundColor:
                            role === 'doctor' ? primary + '25' : border + '30',
                        },
                      ]}
                    >
                      <Heart
                        size={22}
                        color={role === 'doctor' ? primary : muted}
                      />
                    </View>

                    {/* Profile Name at right of logo (NO NUMBERING) */}
                    <View style={styles.roleCardTitleWrap}>
                      <Text
                        style={[
                          styles.roleCardTitle,
                          { color: role === 'doctor' ? primary : text },
                        ]}
                      >
                        Doctor or Caretaker
                      </Text>
                      <Text style={[styles.roleCardTypeTag, { color: muted }]}>
                        Clinical Care & Monitoring
                      </Text>
                    </View>

                    {/* Radio indicator on far right */}
                    <View
                      style={[
                        styles.roleRadioCircle,
                        {
                          borderColor: role === 'doctor' ? primary : border,
                          backgroundColor:
                            role === 'doctor' ? primary : 'transparent',
                        },
                      ]}
                    >
                      {role === 'doctor' && <Check size={12} color="#FAF9F5" />}
                    </View>
                  </View>

                  <Text style={[styles.roleCardDesc, { color: muted }]}>
                    Monitor patient metrics, review clinical recovery logs, and guide care plans.
                  </Text>
                </Pressable>
              </View>

              {/* Continue Button to Signup Form */}
              <Button
                variant="default"
                size="lg"
                onPress={() => setMode('register')}
                style={styles.primaryButton}
              >
                {role === 'patient' ? 'Continue as Patient' : 'Continue as Doctor/Caretaker'}
              </Button>

              {/* Footer Switch */}
              <View style={styles.footerRow}>
                <Text style={[styles.footerText, { color: muted }]}>
                  Already have an account?{' '}
                </Text>
                <Pressable onPress={() => setMode('login')} hitSlop={8}>
                  <Text style={[styles.footerLink, { color: primary }]}>
                    Sign in
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          ) : (
            /* STEP 2: LOGIN / REGISTER FORMS */
            <View style={styles.fullPageContainer}>
              {/* Form Title & Subtitle */}
              <Animated.View entering={FadeInDown.duration(350)} style={styles.headerWrap}>
                <View style={styles.badgePill}>
                  <Text style={[styles.badgeText, { color: primary }]}>
                    MMAI WORKSPACE
                  </Text>
                </View>

                <Text style={[styles.headerTitle, { color: text }]}>
                  {isLogin ? 'Login with email address' : 'Create your account'}
                </Text>

                <Text style={[styles.headerSubtitle, { color: muted }]}>
                  {isLogin
                    ? 'Enter your credentials to access your dashboard'
                    : 'Enter your credentials to set up your account'}
                </Text>
              </Animated.View>

              {/* Form Content */}
              <View style={styles.formContent}>
                <View style={styles.formFields}>
                  {/* Full Name (Sign Up only) */}
                  {isRegister && (
                    <FormField
                      inputRef={nameInputRef}
                      label="Full Name"
                      placeholder="Enter your name"
                      value={name}
                      onChangeText={setName}
                      icon={User}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => emailInputRef.current?.focus()}
                      rightAction={
                        name ? (
                          <Pressable onPress={() => setName('')} hitSlop={8}>
                            <X size={16} color={muted} />
                          </Pressable>
                        ) : null
                      }
                    />
                  )}

                  {/* Email Address */}
                  <FormField
                    inputRef={emailInputRef}
                    label="Email Address"
                    placeholder="nazariisara@yahoo.com"
                    value={email}
                    onChangeText={setEmail}
                    icon={Mail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    rightAction={
                      email ? (
                        <Pressable onPress={() => setEmail('')} hitSlop={8}>
                          <X size={16} color={muted} />
                        </Pressable>
                      ) : null
                    }
                  />

                  {/* Password */}
                  <FormField
                    inputRef={passwordInputRef}
                    label="Password"
                    placeholder="••••••••••••"
                    value={password}
                    onChangeText={setPassword}
                    icon={Lock}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    rightAction={
                      <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
                        {showPassword ? (
                          <EyeOff size={18} color={muted} />
                        ) : (
                          <Eye size={18} color={muted} />
                        )}
                      </Pressable>
                    }
                  />
                </View>

                {/* Meta row: Remember me & Forgot password (Login) */}
                {isLogin ? (
                  <View style={styles.metaRow}>
                    <Pressable
                      style={styles.rememberMeWrap}
                      onPress={() => setRememberMe((r) => !r)}
                      hitSlop={6}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: rememberMe ? primary : border,
                            backgroundColor: rememberMe ? primary : 'transparent',
                          },
                        ]}
                      >
                        {rememberMe && <Check size={12} color="#FFF" />}
                      </View>
                      <Text style={[styles.metaLabel, { color: muted }]}>Remember me</Text>
                    </Pressable>

                    <Pressable hitSlop={6}>
                      <Text style={[styles.forgotText, { color: primary }]}>
                        Forgot password?
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  /* Terms agreement (Sign Up mode) */
                  <Pressable
                    style={styles.termsAgreementWrap}
                    onPress={() => setAgreedToTerms((a) => !a)}
                    hitSlop={6}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: agreedToTerms ? primary : border,
                          backgroundColor: agreedToTerms ? primary : 'transparent',
                        },
                      ]}
                    >
                      {agreedToTerms && <Check size={12} color="#FFF" />}
                    </View>
                    <Text style={[styles.termsText, { color: muted }]}>
                      I agree to the{' '}
                      <Text style={{ color: primary, fontWeight: '600' }}>Terms of Service</Text>{' '}
                      and{' '}
                      <Text style={{ color: primary, fontWeight: '600' }}>Privacy Policy</Text>
                    </Text>
                  </Pressable>
                )}

                {/* Primary Action Button */}
                <Button
                  variant="default"
                  size="lg"
                  onPress={handleSubmit}
                  style={styles.primaryButton}
                >
                  {isLogin ? 'Continue' : `Sign Up as ${role === 'patient' ? 'Patient' : 'Doctor'}`}
                </Button>

                {/* Switch Mode Footer */}
                <View style={styles.footerRow}>
                  <Text style={[styles.footerText, { color: muted }]}>
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (isLogin) {
                        setMode('select-role');
                      } else {
                        setMode('login');
                      }
                    }}
                    hitSlop={8}
                  >
                    <Text style={[styles.footerLink, { color: primary }]}>
                      {isLogin ? 'Sign up' : 'Sign in'}
                    </Text>
                  </Pressable>
                </View>

                {/* Guest option */}
                <Pressable
                  style={styles.guestButton}
                  onPress={onComplete}
                  hitSlop={8}
                >
                  <Text style={[styles.guestText, { color: muted }]}>
                    Skip & continue as guest
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0F12',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  fullPageContainer: {
    width: '100%',
  },

  /* ---------------- Top Navigation Bar ---------------- */
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    minHeight: 38,
    marginBottom: 10,
  },
  navBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 10,
  },
  navBackText: {
    fontSize: 15,
    fontWeight: '500',
  },
  navPlaceholder: {
    width: 60,
  },
  navSwitchLink: {
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 4,
  },
  topRightRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  topRightRoleText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  navDivider: {
    height: 1,
    width: '100%',
    marginBottom: 20,
  },

  /* ---------------- Header ---------------- */
  headerWrap: {
    marginBottom: 18,
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(217, 119, 87, 0.15)',
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },

  /* ---------------- Role Selection Cards (Step 1) ---------------- */
  roleCardsContainer: {
    gap: 14,
    marginBottom: 24,
  },
  roleCardBig: {
    padding: 16,
    borderRadius: 18,
  },
  roleCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  roleCardIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleCardTitleWrap: {
    flex: 1,
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  roleCardTypeTag: {
    fontSize: 11,
    fontWeight: '500',
  },
  roleRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  roleCardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },

  /* ---------------- Form Content ---------------- */
  formContent: {
    width: '100%',
  },
  formFields: {
    gap: 14,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  fieldInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
  },
  fieldIconWrap: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
    margin: 0,
    height: '100%',
  },
  fieldRightWrap: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---------------- Meta Row ---------------- */
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  rememberMeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  termsAgreementWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },

  /* ---------------- Primary CTA ---------------- */
  primaryButton: {
    height: 54,
    borderRadius: 27,
    width: '100%',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },

  /* ---------------- Footer ---------------- */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  guestButton: {
    alignItems: 'center',
    marginTop: 12,
  },
  guestText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
