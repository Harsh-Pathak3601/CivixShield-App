/**
 * patchLinking.ts — Deep Link URI Safety Patch
 *
 * MUST be imported as the very first import in app/_layout.tsx.
 *
 * WHY THIS EXISTS:
 * Expo Router internally registers its own URL event listener (in useLinking.native.js)
 * that calls decodeURIComponent() on every URL segment WITHOUT a try/catch.
 * If a deep link URL contains any malformed percent-encoding (e.g. a bare '%' character
 * coming from notification body text), Expo Router crashes with:
 *   "URIError: Malformed decodeURI input"
 *
 * Our fix in handleDeepLink() runs TOO LATE — Expo Router's listener crashes first.
 *
 * THE FIX:
 * We patch RCTDeviceEventEmitter.emit() at the module level (before any component
 * renders and before Expo Router registers its listener). When a 'url' event arrives,
 * we validate it with decodeURIComponent() first. If it's malformed, we drop the event
 * silently — preventing the crash for ALL listeners including Expo Router's internal one.
 */

try {
  // Access the singleton RCTDeviceEventEmitter used by React Native's Linking module.
  // This is the lowest-level event bus that all URL events flow through.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RCTDeviceEventEmitter = require('react-native/Libraries/EventEmitter/RCTDeviceEventEmitter').default;

  const _originalEmit = RCTDeviceEventEmitter.emit.bind(RCTDeviceEventEmitter);

  RCTDeviceEventEmitter.emit = function (eventType: string, ...args: unknown[]) {
    if (eventType === 'url') {
      // The URL may arrive as a plain string OR as { url: string }
      const rawUrl: string =
        typeof args[0] === 'string'
          ? args[0]
          : (args[0] as { url?: string })?.url ?? '';

      if (rawUrl) {
        try {
          // Validate the URL is safely decodable before letting it propagate
          // to Expo Router's decodeURIComponent calls.
          decodeURIComponent(rawUrl.replace(/\+/g, ' '));
        } catch {
          console.warn(
            '[CivixShield] Dropped malformed deep link URL (bad percent-encoding):',
            rawUrl
          );
          // Drop the event — do NOT call _originalEmit.
          // This prevents the Expo Router crash completely.
          return;
        }
      }
    }

    return _originalEmit(eventType, ...args);
  };

  console.log('[CivixShield] Deep link URI safety patch applied ✅');
} catch (e) {
  // If the patch fails for any reason (e.g. Metro bundler changes), log and continue.
  // The app will still run; worst case the URIError may appear if a bad URL arrives.
  console.warn('[CivixShield] Could not apply deep link patch:', e);
}
