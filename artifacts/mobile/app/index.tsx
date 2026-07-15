import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
  Image,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hostOf, openableOutside, staysInGlass } from '@/lib/door';

// The true glass exists only in the phone's hand. react-native-webview has no
// web arm, so the browser preview shows the same house through a plain window
// instead — never let the native module load on web.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebView = Platform.OS === 'web' ? null : require('react-native-webview').WebView;

const INK = '#0d0b14';
const VELLUM = '#efe6d0';
const PARCHMENT_DIM = '#9a8f78';
const FOIL = '#f3d489';
const FOIL_DEEP = '#d4a24e';

// Where the glass looks: an explicit override wins, then the domain this
// build was poured for, then the open web's own gate.
const GAME_URL =
  process.env.EXPO_PUBLIC_GAME_URL ||
  (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : 'https://mydungeon.quest');

const GAME_HOST = hostOf(GAME_URL) ?? 'mydungeon.quest';

// THE DOOR LAW OF THE GLASS lives in @/lib/door (pure, benched by
// lib/door.test.mjs): house pages stay inside; checkout and third-party
// sign-in parlors open in the system browser; parser tricks resolve
// outward; script/data pseudo-doors drop cold. The name-door's courier
// rides the house's own domain, so the email-code way in never leaves.

/** The loading curtain — theater, never a spinner. */
function RoseCurtain({ line }: { line: string }) {
  const glow = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const breath = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.45, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    breath.start();
    return () => breath.stop();
  }, [glow]);
  return (
    <View style={styles.curtain}>
      <Animated.Image
        source={require('@/assets/images/splash-icon.png')}
        style={[styles.rose, { opacity: glow }]}
        resizeMode="contain"
      />
      <Text style={styles.curtainLine}>{line}</Text>
    </View>
  );
}

/** The cold hearth — the honest face of a road with no connection. */
function ColdHearth({ onStir }: { onStir: () => void }) {
  return (
    <View style={styles.curtain}>
      <Image
        source={require('@/assets/images/splash-icon.png')}
        style={[styles.rose, styles.roseDim]}
        resizeMode="contain"
      />
      <Text style={styles.hearthTitle}>The hearth has gone cold</Text>
      <Text style={styles.hearthLine}>
        The road to the house needs a living connection. Your tale keeps itself — nothing is lost.
      </Text>
      <Pressable
        onPress={onStir}
        style={({ pressed }) => [styles.stir, pressed && styles.stirPressed]}
        accessibilityRole="button"
        accessibilityLabel="Try to reconnect"
      >
        <Text style={styles.stirLabel}>Stir the fire</Text>
      </Pressable>
    </View>
  );
}

export default function Shell() {
  const insets = useSafeAreaInsets();
  const webRef = useRef<any>(null);
  const canGoBack = useRef(false);

  // THE BACK LAW — Android's back gesture walks the house's own history;
  // only at the true threshold does it ask before leaving.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      Alert.alert('Leave the house?', 'The door stays open, and your tale keeps itself.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <View
      style={[
        styles.frame,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={INK} />
      {Platform.OS === 'web' ? (
        React.createElement('iframe' as any, {
          src: GAME_URL,
          title: 'MyDungeon.Quest',
          allow: 'autoplay; clipboard-write',
          style: { border: 0, width: '100%', height: '100%', background: INK },
        })
      ) : (
        <WebView
          ref={webRef}
          source={{ uri: GAME_URL }}
          style={styles.glass}
          // Full command of every door, including non-web schemes.
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={(request: { url: string }) => {
            if (staysInGlass(request.url, GAME_HOST)) return true;
            if (openableOutside(request.url)) Linking.openURL(request.url).catch(() => {});
            return false;
          }}
          onNavigationStateChange={(nav: { canGoBack: boolean }) => {
            canGoBack.current = nav.canGoBack;
          }}
          // The house's own autoplay law (one blessed voice, tap-invited)
          // governs sound; the glass simply does not add a second lock.
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          // window.open folds back into this glass, where the door law reads it.
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          overScrollMode="never"
          bounces={false}
          textZoom={100}
          applicationNameForUserAgent="MyDungeonShell/1"
          startInLoadingState
          renderLoading={() => <RoseCurtain line="The road unrolls…" />}
          renderError={() => <ColdHearth onStir={() => webRef.current?.reload()} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: INK,
  },
  glass: {
    flex: 1,
    backgroundColor: INK,
  },
  curtain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 32,
  },
  rose: {
    width: 132,
    height: 132,
  },
  roseDim: {
    opacity: 0.55,
  },
  curtainLine: {
    color: PARCHMENT_DIM,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.4,
  },
  hearthTitle: {
    color: VELLUM,
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
  hearthLine: {
    color: PARCHMENT_DIM,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    maxWidth: 300,
  },
  stir: {
    marginTop: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: FOIL_DEEP,
    paddingHorizontal: 26,
    paddingVertical: 12,
    backgroundColor: 'rgba(212, 162, 78, 0.12)',
  },
  stirPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  stirLabel: {
    color: FOIL,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
});
