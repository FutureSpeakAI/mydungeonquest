// THE DOOR — sign-in woven into the house, never nailed onto it.
//
// Opt-in doctrine (same law as the media providers): if the build carries no
// publishable key, the door was never built — PatronShell returns its
// children untouched, PatronDoor renders nothing, and keyless play is
// byte-for-byte the keyless game. The headless eval pins the key to '' and
// so always walks the doorless house.
//
// With a key, the owner's directive (July 2026) holds: THE DOOR IS LOCKED.
// Nobody plays unnamed — the shell adds wouter routing for /sign-in and
// /sign-up (Clerk needs real paths for its OAuth callbacks), and every other
// path renders the game only for a signed-in patron; the signed-out see the
// locked title and the house's offer: six turns free, then a seat.
import { useEffect, useMemo } from 'react';
import { vaultSessionChanged } from '../lib/vault.js';
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const envKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
export const doorBuilt = Boolean(envKey);
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// Canonical key resolution (resolves per-hostname so one build can serve
// Clerk custom domains), guarded by doorBuilt: a keyless build must not
// touch the resolver — the headless eval has no window.location at all.
const clerkPubKey = doorBuilt
  ? publishableKeyFromHost(window.location.hostname, envKey)
  : '';
// Empty in dev (Clerk talks to its dev Frontend API directly), auto-set in
// prod. Passed unconditionally — never gated on PROD/NODE_ENV.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

// Clerk hands routerPush full paths; wouter's setLocation prepends the base —
// strip it to avoid doubling.
function stripBase(path) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

// The house palette, spoken in Clerk's tongue. No Tailwind here — inline
// style objects against the vellum-and-candlelight variables of styles.css.
function useDoorAppearance() {
  return useMemo(() => ({
    theme: 'simple',
    options: {
      logoPlacement: 'inside',
      logoLinkUrl: basePath || '/',
      logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
      socialButtonsPlacement: 'top',
    },
    variables: {
      colorPrimary: '#d4a24e',
      colorForeground: '#e9dfc8',
      colorMutedForeground: '#bfb39b',
      colorBackground: '#171221',
      colorInput: '#0d0b14',
      colorInputForeground: '#e9dfc8',
      colorDanger: '#c96f6f',
      colorNeutral: '#e9dfc8',
      fontFamily: '"Crimson Pro", Georgia, serif',
      borderRadius: '12px',
    },
    elements: {
      rootBox: { width: '100%', display: 'flex', justifyContent: 'center' },
      // cardBox is the one true surface — card/footer sit transparent on it.
      cardBox: {
        backgroundColor: '#171221',
        border: '1px solid rgba(212,162,78,.28)',
        borderRadius: '18px',
        width: '440px',
        maxWidth: '100%',
        overflow: 'hidden',
        boxShadow: '0 24px 70px rgba(0,0,0,.55)',
      },
      card: { backgroundColor: 'transparent', boxShadow: 'none' },
      footer: { backgroundColor: 'transparent' },
      headerTitle: { fontFamily: 'Cinzel, Georgia, serif', color: '#e9dfc8' },
      headerSubtitle: { color: '#bfb39b' },
      formFieldLabel: { color: '#bfb39b' },
      formFieldInput: { backgroundColor: '#0d0b14', color: '#e9dfc8', border: '1px solid rgba(233,223,200,.18)' },
      formButtonPrimary: {
        background: 'linear-gradient(135deg,#e1b45f,#9d7031)',
        color: '#160f08',
        fontFamily: 'Cinzel, Georgia, serif',
        fontWeight: 700,
        letterSpacing: '.035em',
      },
      socialButtonsBlockButton: { border: '1px solid rgba(233,223,200,.2)', backgroundColor: 'rgba(233,223,200,.05)' },
      socialButtonsBlockButtonText: { color: '#e9dfc8' },
      dividerText: { color: '#bfb39b' },
      dividerLine: { backgroundColor: 'rgba(233,223,200,.14)' },
      footerActionText: { color: '#bfb39b' },
      footerActionLink: { color: '#d4a24e' },
      identityPreviewEditButton: { color: '#d4a24e' },
      formFieldSuccessText: { color: '#a9c9b9' },
      alertText: { color: '#e9dfc8' },
      otpCodeFieldInput: { backgroundColor: '#0d0b14', color: '#e9dfc8', border: '1px solid rgba(233,223,200,.18)' },
      logoBox: { justifyContent: 'center' },
      logoImage: { height: '44px' },
    },
  }), []);
}

const doorWords = {
  signIn: {
    start: {
      title: 'Give your name at the door',
      subtitle: 'The book remembers its patrons.',
    },
  },
  signUp: {
    start: {
      title: 'Take up the quill',
      subtitle: 'Six turns on the house — your chronicles stay yours, on your device.',
    },
  },
};

function SignInPage() {
  return (
    <div className="door-page">
      <div>
        {/* path must be the full browser path — Clerk reads window.location directly */}
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
        <p className="door-return"><Link href="/" className="text-button">← Return to the door</Link></p>
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="door-page">
      <div>
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
        <p className="door-return"><Link href="/" className="text-button">← Return to the door</Link></p>
      </div>
    </div>
  );
}

// Always mounted while the door stands: tells the vault the moment the
// session changes, so sign-in awakens sync without a reload and sign-out
// returns every spine to quiet local custody.
function VaultWatch() {
  const { user, isLoaded } = useUser();
  useEffect(() => { if (isLoaded) vaultSessionChanged(user?.id || null); }, [isLoaded, user?.id]);
  return null;
}

// THE LOCKED TITLE — what a nameless visitor sees where the game would be.
// The same candlelit face as the true title, honest about the deal: a name
// first; six turns on the house; then $5 by the week or $129.99 by the year.
function LockedTitle() {
  const art = `${import.meta.env.BASE_URL}keyart/gate.jpg`;
  return (
    <main className="title-page cinematic">
      <div className="title-bg" style={{ backgroundImage: `url("${art}")` }} aria-hidden />
      <div className="title-veil" aria-hidden />
      <section className="title-hero">
        <div className="candle" aria-hidden="true"><span className="halo" /><span className="flame" /><span className="stem" /></div>
        <span className="eyebrow">Cinematic Edition</span>
        <h1>MyDungeon<span>.Quest</span></h1>
        <p>A tale that is actually yours — once the book knows your name.</p>
        <Link href="/sign-in" className="primary-button big">Give your name at the door</Link>
        <p className="muted door-offer">
          Six turns on the house — painted plates, spoken voices, the works.<br />
          Then $5 a week, or $129.99 for a year without measure.
        </p>
        <p className="door-return">
          <Link href="/sign-up" className="text-button">New to the house? Take up the quill</Link>
          {' · '}
          <a href="/welcome.html" className="text-button">Read the full board</a>
        </p>
      </section>
    </main>
  );
}

// The lock itself: children (the whole game) render only for a named
// patron. While Clerk is still reading the session, a dark stage — never a
// flash of a game that is about to be taken away.
function DoorGate({ children }) {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return <main className="title-page cinematic" aria-busy="true" />;
  if (!user) return <LockedTitle />;
  return children;
}

function DoorFrame({ children }) {
  const [, setLocation] = useLocation();
  const appearance = useDoorAppearance();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={appearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={doorWords}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <VaultWatch />
      <Switch>
        {/* Verbatim wouter patterns — the /*? optional wildcard is the only
            syntax that matches both the bare URL and Clerk's OAuth sub-paths
            (/sign-in/sso-callback, /sign-in/factor-one). */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        {/* Everything else is the game — behind the lock. The nameless see
            the locked title and the offer, never a playable table. */}
        <Route><DoorGate>{children}</DoorGate></Route>
      </Switch>
    </ClerkProvider>
  );
}

// Wraps the app in main.jsx. Keyless: children pass through untouched —
// no router, no provider, no new code paths for the eval or a fork.
export function PatronShell({ children }) {
  if (!doorBuilt) return children;
  return <WouterRouter base={basePath}><DoorFrame>{children}</DoorFrame></WouterRouter>;
}

// No query-cache invalidator here on purpose: the app keeps no server-fetched
// client cache — chronicles live in IndexedDB under device custody, and the
// only identity readers are Clerk's own hooks, which track the session.

function PatronDoorInner() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  if (!isLoaded) return null;
  if (!user) {
    return (
      <span className="door-line">
        <button type="button" className="door-link" onClick={() => setLocation('/sign-in')}>
          Give your name at the door
        </button>
      </span>
    );
  }
  const name = user.firstName || user.username || '';
  return (
    <span className="door-line">
      <span className="door-known">The book knows you{name ? `, ${name}` : ''}.</span>
      <button type="button" className="door-link" onClick={() => signOut({ redirectUrl: basePath || '/' })}>
        Depart
      </button>
    </span>
  );
}

// The quiet line in the title footer. Rides the arrival staging and attract
// fade for free because it lives inside .title-footer — the cold open is
// untouched. Renders nothing at all on a doorless build.
export function PatronDoor() {
  if (!doorBuilt) return null;
  return <PatronDoorInner />;
}
