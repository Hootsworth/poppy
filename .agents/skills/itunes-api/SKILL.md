---
name: itunes-api
description: Search and play music, audio previews, and album artwork using Apple's iTunes Search API. Use whenever creating or modifying music players, playlists, song searches, or audio preview features to ensure zero-CORS JSONP loading, 30-second audio streaming, and high-res cover art.
---

# iTunes Search API Integration Guide

This skill provides the standard, production-ready patterns for integrating Apple's iTunes Search API into client-side web applications and single-file tools without backend servers or CORS errors.

---

## 1. The CORS Rule (Critical)

**NEVER use `fetch()` or `XMLHttpRequest` with `itunes.apple.com`.**
Apple's servers do not return the `Access-Control-Allow-Origin: *` header, so standard `fetch()` will always be blocked by modern browsers.

Instead, **ALWAYS use JSONP** (dynamic `<script>` tag injection with a `&callback=` parameter). The browser does not restrict `<script>` tags across origins.

---

## 2. Standard JSONP Search Function

Use this drop-in helper to search tracks, artists, and albums:

```javascript
function searchiTunes(term, limit = 20) {
  return new Promise((resolve, reject) => {
    const callbackName = 'itunes_cb_' + Math.random().toString(36).slice(2, 9);
    const script = document.createElement('script');

    // Timeout safety (5 seconds)
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('iTunes search timed out'));
    }, 5000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      if (script.parentNode) script.remove();
    }

    window[callbackName] = (data) => {
      cleanup();
      resolve(data.results || []);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Failed to load iTunes script'));
    };

    const query = encodeURIComponent(term.trim());
    script.src = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=${limit}&callback=${callbackName}`;
    document.body.appendChild(script);
  });
}
```

---

## 3. Data Structure & Audio Previews

Each item returned in `data.results` contains:

| Property | Type | Description |
| :--- | :--- | :--- |
| `trackId` | Number | Unique track identifier |
| `trackName` | String | Song title |
| `artistName` | String | Artist name |
| `collectionName` | String | Album title |
| `previewUrl` | String | Absolute HTTPS URL to a 30-second AAC/m4a audio clip |
| `artworkUrl100` | String | 100x100 thumbnail artwork |
| `trackTimeMillis`| Number | Total track duration in milliseconds |
| `primaryGenreName`| String | Genre (e.g., Pop, Rock, Electronic) |

### High-Resolution Album Artwork
Apple provides 100x100 thumbnails by default. To display crisp 600x600 high-res cover art on retina screens:
```javascript
function getHighResArtwork(track, size = 600) {
  if (!track.artworkUrl100) return '';
  return track.artworkUrl100.replace('100x100bb', `${size}x${size}bb`);
}
```

---

## 4. Audio Playback & Browser Autoplay Policies

Modern browsers restrict autoplay unless triggered by a user gesture (click/tap):

```javascript
const player = new Audio();

function playTrack(previewUrl) {
  if (!previewUrl) return;
  player.src = previewUrl;
  
  const playPromise = player.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => {
      console.warn('Autoplay blocked by browser policy. Waiting for user interaction.', err);
      // Fallback: resume on first user interaction
      window.addEventListener('click', () => player.play(), { once: true });
    });
  }
}
```

---

## 5. Offline / Fallback Mock Strategy

If network is offline or a query returns 0 results, **never use bare relative filenames** (e.g., `"mzaf_123.m4a"`), which 404 in iframe sandboxes. Always use either:
1. Synthesized Web Audio API sound effects (beeps, chord synth).
2. Data URLs or verified public CDN audio (e.g., Internet Archive or Wikimedia Commons).
