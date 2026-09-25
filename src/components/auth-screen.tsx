import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/useColor';
import { useToast } from '@/components/ui/toast';
import {
  signUpDoctor,
  verifyDoctorOtp,
  resendDoctorOtp,
  loginPatientWithSecretKey,
  requestPatientLoginOtp,
  verifyPatientLoginOtp,
  signInDoctor,
} from '@/lib/supabase';
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

type AuthMode = 'login' | 'register' | 'verify';
type UserRole = 'patient' | 'doctor';

type AuthScreenProps = {
  onComplete: () => void;
};

/* Vector Switch Icon */
function SwitchIcon({ size = 12, color = '#748B75' }: { size?: number; color?: string }) {
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
            backgroundColor: '#FFFFFF',
            borderColor: isFocused ? primaryColor : borderColor,
          },
        ]}
        onPress={() => inputRef?.current?.focus()}
      >
        <View style={styles.fieldIconWrap}>
          <IconComponent size={18} color={isFocused ? primaryColor : mutedColor} />
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

  // 8-digit secret key (login) & 6-digit verify code
  const [secretKey, setSecretKey] = useState<string[]>(Array(6).fill(''));
  const [verifyCode, setVerifyCode] = useState<string[]>(Array(6).fill(''));

  const scrollViewRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);
  const secretKeyRefs = useRef<(TextInput | null)[]>(Array(6).fill(null));
  const verifyRefs = useRef<(TextInput | null)[]>(Array(6).fill(null));

  const primary = useColor('primary');
  const text = useColor('text');
  const muted = useColor('textMuted');
  const card = useColor('card');
  const border = useColor('border');
  const insets = useSafeAreaInsets();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [isDoctorSignIn, setIsDoctorSignIn] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<'doctor' | 'patient'>('patient');
  const [verifiedPatientEmail, setVerifiedPatientEmail] = useState('');
  const [enteredSecretKey, setEnteredSecretKey] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isVerify = mode === 'verify';

  const handleBack = () => {
    if (isDoctorSignIn) {
      setIsDoctorSignIn(false);
    } else if (isRegister) {
      setMode('login');
      setIsDoctorSignIn(false);
    } else if (isVerify) {
      if (verifyTarget === 'patient') {
        setMode('login');
      } else {
        setMode('register');
      }
    }
  };

  // Patient Secret Key Verification (Step 1: check code & trigger email OTP via Resend)
  const handlePatientKeySubmit = async (codeToVerify?: string) => {
    const code = (codeToVerify || secretKey.join('')).trim();
    if (code.length < 6) {
      error('Incomplete Code', 'Please enter all 6 digits of your secret key.');
      return;
    }

    try {
      setLoading(true);
      const result = await requestPatientLoginOtp(code);
      setEnteredSecretKey(code);

      if (result.patient_email) {
        setVerifyTarget('patient');
        setVerifiedPatientEmail(result.patient_email);
        setVerifyCode(Array(6).fill(''));
        if (result.otp) {
          setDemoOtp(result.otp);
        }
        setMode('verify');
        success(
          'Verification Sent!',
          result.otp
            ? `Code: ${result.otp} • (Sent to ${result.patient_email})`
            : `We sent a 6-digit login code to ${result.patient_email}`
        );
      } else {
        // Fallback if patient has no email
        const session = await loginPatientWithSecretKey(code);
        success('Welcome Back!', `Logged in as ${session.patient_name}`);
        onComplete();
      }
    } catch (err: any) {
      error('Access Denied', err.message || 'Invalid or expired secret key.');
      setSecretKey(Array(6).fill(''));
      secretKeyRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Doctor Sign Up
  const handleDoctorSignUp = async () => {
    if (!name.trim()) {
      error('Missing Name', 'Please enter your full name.');
      nameInputRef.current?.focus();
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      error('Invalid Email', 'Please enter a valid doctor email address.');
      emailInputRef.current?.focus();
      return;
    }
    if (password.length < 6) {
      error('Weak Password', 'Password must be at least 6 characters.');
      passwordInputRef.current?.focus();
      return;
    }
    if (!agreedToTerms) {
      error('Terms Required', 'Please accept the Terms of Service to create an account.');
      return;
    }

    try {
      setLoading(true);
      await signUpDoctor({ email, password, fullName: name });
      setVerifyTarget('doctor');
      setVerifyCode(Array(6).fill(''));
      setMode('verify');
      success('Verification Sent!', `We sent a 6-digit confirmation code to ${email}`);
    } catch (err: any) {
      error('Sign Up Failed', err.message || 'Unable to create doctor account.');
    } finally {
      setLoading(false);
    }
  };

  // Doctor Sign In
  const handleDoctorSignIn = async () => {
    if (!email.trim() || !email.includes('@')) {
      error('Invalid Email', 'Please enter your doctor email address.');
      emailInputRef.current?.focus();
      return;
    }
    if (!password) {
      error('Missing Password', 'Please enter your password.');
      passwordInputRef.current?.focus();
      return;
    }

    try {
      setLoading(true);
      await signInDoctor({ email, password });
      success('Welcome Back', 'Doctor login successful.');
      onComplete();
    } catch (err: any) {
      error('Login Failed', err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Email OTP Verification (Doctor confirmation or Patient login OTP)
  const handleVerifySubmit = async (codeToVerify?: string) => {
    const code = (codeToVerify || verifyCode.join('')).trim();
    if (code.length < 6) {
      error('Incomplete Code', 'Please enter the 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      if (verifyTarget === 'patient') {
        const session = await verifyPatientLoginOtp({
          secretCode: enteredSecretKey,
          otpCode: code,
        });
        success('Access Granted!', `Welcome, ${session.patient_name}`);
        onComplete();
      } else {
        await verifyDoctorOtp({ email, token: code });
        success('Verified!', 'Your doctor account is verified.');
        onComplete();
      }
    } catch (err: any) {
      error('Verification Failed', err.message || 'Invalid or expired verification code.');
      setVerifyCode(Array(6).fill(''));
      verifyRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend Verification Code
  const handleResendCode = async () => {
    try {
      setLoading(true);
      if (verifyTarget === 'patient') {
        if (!enteredSecretKey) {
          error('Session Expired', 'Please return to login and re-enter your secret key.');
          return;
        }
        const res = await requestPatientLoginOtp(enteredSecretKey);
        if (res.otp) {
          setDemoOtp(res.otp);
        }
        success(
          'Code Resent!',
          res.otp
            ? `Code: ${res.otp} • (Sent to ${verifiedPatientEmail || 'your email'})`
            : `A fresh 6-digit login code was sent to ${verifiedPatientEmail || 'your email'}.`
        );
      } else {
        if (!email) {
          error('No Email Found', 'Please return to sign up and enter your email.');
          return;
        }
        await resendDoctorOtp(email);
        success('Code Resent!', 'Check your inbox for the fresh 6-digit code.');
      }
    } catch (err: any) {
      error('Resend Failed', err.message || 'Unable to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  // Handle secret key digit input
  const handleSecretKeyChange = (val: string, idx: number) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...secretKey];
    next[idx] = digit;
    setSecretKey(next);
    if (digit && idx < 5) {
      secretKeyRefs.current[idx + 1]?.focus();
    }
    if (next.every((d) => d !== '') && idx === 5) {
      handlePatientKeySubmit(next.join(''));
    }
  };

  const handleSecretKeyBackspace = (key: string, idx: number) => {
    if (key === 'Backspace' && !secretKey[idx] && idx > 0) {
      secretKeyRefs.current[idx - 1]?.focus();
    }
  };

  // Handle verify code digit input
  const handleVerifyChange = (val: string, idx: number) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...verifyCode];
    next[idx] = digit;
    setVerifyCode(next);
    if (digit && idx < 5) {
      verifyRefs.current[idx + 1]?.focus();
    }
    if (next.every((d) => d !== '') && idx === 5) {
      handleVerifySubmit(next.join(''));
    }
  };

  const handleVerifyBackspace = (key: string, idx: number) => {
    if (key === 'Backspace' && !verifyCode[idx] && idx > 0) {
      verifyRefs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: '#FFFFFF' }]}>
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
            {/* Left: Back button if in register, verify, or doctor sign in */}
            {!isLogin || isDoctorSignIn ? (
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

            {/* Right: sign-up on login only */}
            {isLogin ? (
              <Pressable onPress={() => setMode('register')} hitSlop={8}>
                <Text style={[styles.navSwitchLink, { color: primary }]}>Sign up</Text>
              </Pressable>
            ) : (
              <View style={styles.navPlaceholder} />
            )}
          </View>

          {/* Clean Horizontal Divider */}
          <View style={[styles.navDivider, { backgroundColor: border + '38' }]} />

          {/* ======================================================== */}
          {/* ALL OPTIONS BELOW DIVIDER                                */}
          {/* ======================================================== */}
          {isVerify ? (
            /* VERIFY: Email OTP Screen */
            <Animated.View entering={FadeInDown.duration(350)} style={styles.fullPageContainer}>
              <View style={styles.headerWrap}>
                <View style={styles.badgePill}>
                  <Text style={[styles.badgeText, { color: primary }]}>VERIFICATION</Text>
                </View>
                <Text style={[styles.headerTitle, { color: text }]}>Check your email</Text>
                <Text style={[styles.headerSubtitle, { color: muted }]}>
                  We sent a 6-digit code to{' '}
                  <Text style={{ color: text, fontWeight: '700' }}>
                    {verifyTarget === 'patient'
                      ? verifiedPatientEmail || 'your registered email address'
                      : email || 'your registered email address'}
                  </Text>
                  . Enter it below to continue.
                </Text>
              </View>

              <View style={styles.otpRow}>
                {verifyCode.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(r) => { verifyRefs.current[idx] = r; }}
                    value={digit}
                    onChangeText={(v) => handleVerifyChange(v, idx)}
                    onKeyPress={({ nativeEvent }) => handleVerifyBackspace(nativeEvent.key, idx)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    style={[
                      styles.otpBox,
                      {
                        color: text,
                        borderColor: border,
                        backgroundColor: 'transparent',
                      },
                    ]}
                    placeholderTextColor={muted + '60'}
                    placeholder="·"
                  />
                ))}
              </View>

              {demoOtp && verifyTarget === 'patient' && (
                <View style={styles.demoBadge}>
                  <Text style={[styles.demoBadgeText, { color: muted }]}>
                    Login Code: <Text style={{ color: primary, fontWeight: '700', fontFamily: 'monospace' }}>{demoOtp}</Text>
                  </Text>
                </View>
              )}

              <Button
                variant="default"
                size="lg"
                loading={loading}
                onPress={() => handleVerifySubmit()}
                style={[styles.primaryButton, { marginTop: 32 }]}
              >
                Verify & Continue
              </Button>

              <Pressable
                style={[styles.guestButton, { marginTop: 16 }]}
                onPress={handleResendCode}
                hitSlop={8}
              >
                <Text style={[styles.forgotText, { color: primary }]}>Resend code</Text>
              </Pressable>
            </Animated.View>
          ) : (
            /* LOGIN / REGISTER FORMS */
            <View style={styles.fullPageContainer}>
              <Animated.View entering={FadeInDown.duration(350)} style={styles.headerWrap}>
                <View style={styles.badgePill}>
                  <Text style={[styles.badgeText, { color: primary }]}>
                    {isRegister ? 'AS DOCTOR' : isDoctorSignIn ? 'AS DOCTOR' : 'AS PATIENT'}
                  </Text>
                </View>
                <Text style={[styles.headerTitle, { color: text }]}>
                  {isRegister
                    ? 'Create your account'
                    : isDoctorSignIn
                    ? 'Doctor Workspace'
                    : 'Enter your secret key'}
                </Text>
                <Text style={[styles.headerSubtitle, { color: muted }]}>
                  {isRegister
                    ? 'Enter your credentials to set up your doctor account'
                    : isDoctorSignIn
                    ? 'Sign in with your doctor credentials to access your workspace'
                    : 'Enter the 6-digit access code provided by your caretaker'}
                </Text>
              </Animated.View>

              <View style={styles.formContent}>
                {isLogin ? (
                  /* ── Login screen ── */
                  !isDoctorSignIn ? (
                    /* Patient Secret Key Login */
                    <View>
                      <Text style={[styles.otpLabel, { color: muted }]}>Secret Key</Text>
                      <View style={styles.otpRow}>
                        {secretKey.map((digit, idx) => (
                          <TextInput
                            key={idx}
                            ref={(r) => { secretKeyRefs.current[idx] = r; }}
                            value={digit}
                            onChangeText={(v) => handleSecretKeyChange(v, idx)}
                            onKeyPress={({ nativeEvent }) => handleSecretKeyBackspace(nativeEvent.key, idx)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            style={[
                              styles.otpBox,
                              {
                                color: text,
                                borderColor: border,
                                backgroundColor: 'transparent',
                              },
                            ]}
                            placeholderTextColor={muted + '60'}
                            placeholder="·"
                          />
                        ))}
                      </View>

                      <Button
                        variant="default"
                        size="lg"
                        loading={loading}
                        onPress={() => handlePatientKeySubmit()}
                        style={[styles.primaryButton, { marginTop: 32 }]}
                      >
                        Continue
                      </Button>

                      <Pressable
                        style={styles.switchRoleButton}
                        onPress={() => setIsDoctorSignIn(true)}
                        hitSlop={8}
                      >
                        <Text style={[styles.switchRoleText, { color: primary }]}>
                          Doctor? Sign in with email
                        </Text>
                      </Pressable>

                      <View style={styles.footerRow}>
                        <Text style={[styles.footerText, { color: muted }]}>Don't have an account? </Text>
                        <Pressable onPress={() => { setMode('register'); setIsDoctorSignIn(false); }} hitSlop={8}>
                          <Text style={[styles.footerLink, { color: primary }]}>Sign up</Text>
                        </Pressable>
                      </View>

                      <Pressable style={styles.guestButton} onPress={onComplete} hitSlop={8}>
                        <Text style={[styles.guestText, { color: muted }]}>Skip & continue as guest</Text>
                      </Pressable>
                    </View>
                  ) : (
                    /* Doctor Email & Password Sign In */
                    <View style={styles.formFields}>
                      <FormField
                        inputRef={emailInputRef}
                        label="Doctor Email"
                        placeholder="doctor@mmai.health"
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

                      <FormField
                        inputRef={passwordInputRef}
                        label="Password"
                        placeholder="••••••••••••"
                        value={password}
                        onChangeText={setPassword}
                        icon={Lock}
                        secureTextEntry={!showPassword}
                        returnKeyType="done"
                        onSubmitEditing={handleDoctorSignIn}
                        rightAction={
                          <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
                            {showPassword ? <EyeOff size={18} color={muted} /> : <Eye size={18} color={muted} />}
                          </Pressable>
                        }
                      />

                      <Button
                        variant="default"
                        size="lg"
                        loading={loading}
                        onPress={handleDoctorSignIn}
                        style={[styles.primaryButton, { marginTop: 12 }]}
                      >
                        Sign In as Doctor
                      </Button>

                      <Pressable
                        style={styles.switchRoleButton}
                        onPress={() => setIsDoctorSignIn(false)}
                        hitSlop={8}
                      >
                        <Text style={[styles.switchRoleText, { color: primary }]}>
                          Patient? Sign in with secret key
                        </Text>
                      </Pressable>

                      <View style={styles.footerRow}>
                        <Text style={[styles.footerText, { color: muted }]}>Don't have an account? </Text>
                        <Pressable onPress={() => { setMode('register'); setIsDoctorSignIn(false); }} hitSlop={8}>
                          <Text style={[styles.footerLink, { color: primary }]}>Sign up</Text>
                        </Pressable>
                      </View>

                      <Pressable style={styles.guestButton} onPress={onComplete} hitSlop={8}>
                        <Text style={[styles.guestText, { color: muted }]}>Skip & continue as guest</Text>
                      </Pressable>
                    </View>
                  )
                ) : (
                  /* ── Register form ── */
                  <View style={styles.formFields}>
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

                    <FormField
                      inputRef={emailInputRef}
                      label="Email Address"
                      placeholder="you@example.com"
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

                    <FormField
                      inputRef={passwordInputRef}
                      label="Password"
                      placeholder="••••••••••••"
                      value={password}
                      onChangeText={setPassword}
                      icon={Lock}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleDoctorSignUp}
                      rightAction={
                        <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
                          {showPassword ? <EyeOff size={18} color={muted} /> : <Eye size={18} color={muted} />}
                        </Pressable>
                      }
                    />

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
                        <Text style={{ color: primary, fontWeight: '500', fontSize: 13 }}>Terms of Service</Text>{' '}
                        and{' '}
                        <Text style={{ color: primary, fontWeight: '500', fontSize: 13 }}>Privacy Policy</Text>
                      </Text>
                    </Pressable>

                    <Button
                      variant="default"
                      size="lg"
                      loading={loading}
                      onPress={handleDoctorSignUp}
                      style={styles.primaryButton}
                    >
                      Sign Up
                    </Button>

                    <View style={styles.footerRow}>
                      <Text style={[styles.footerText, { color: muted }]}>Already have an account? </Text>
                      <Pressable onPress={() => { setMode('login'); setIsDoctorSignIn(true); }} hitSlop={8}>
                        <Text style={[styles.footerLink, { color: primary }]}>Sign in</Text>
                      </Pressable>
                    </View>

                    <Pressable style={styles.guestButton} onPress={onComplete} hitSlop={8}>
                      <Text style={[styles.guestText, { color: muted }]}>Skip & continue as guest</Text>
                    </Pressable>
                  </View>
                )}
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
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
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
    marginBottom: 8,
  },
  navBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 10,
  },
  navBackText: {
    fontSize: 14,
    fontWeight: '600',
  },
  navPlaceholder: {
    width: 60,
  },
  navSwitchLink: {
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 4,
  },
  navDivider: {
    height: 1,
    width: '100%',
    marginBottom: 20,
  },

  /* ---------------- Header ---------------- */
  headerWrap: {
    marginBottom: 22,
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  fieldInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    height: 50,
    backgroundColor: '#FFFFFF',
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
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---------------- Checkbox & Terms ---------------- */
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsAgreementWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },

  /* ---------------- OTP Boxes (Minimal White) ---------------- */
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 22,
    fontWeight: '700',
    padding: 0,
    backgroundColor: '#FFFFFF',
  },

  /* ---------------- Primary CTA Button ---------------- */
  primaryButton: {
    height: 50,
    borderRadius: 8,
    width: '100%',
  },

  /* ---------------- Links & Footer ---------------- */
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
    marginTop: 14,
  },
  guestText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  switchRoleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  switchRoleText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  demoBadge: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignSelf: 'center',
  },
  demoBadgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
