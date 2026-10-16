// CINEMA+ player sources — add only video you own or are licensed to stream.
// Format:
// export const playbackSources = {
//   'movie:123': [{ id:'main', name:'السيرفر الرئيسي', kind:'mp4', url:'https://your-cdn.example/video.mp4' }],
//   'tv:456:s1:e2': [{ id:'main', name:'السيرفر الرئيسي', kind:'mp4', url:'https://your-cdn.example/episode.mp4' }]
// };
// Supported kinds: mp4, hls (native Safari support), embed (trusted HTTPS embeds), torrent (HTTPS streaming gateway only).
// For a torrent you have distribution rights to, run a separate backend gateway that serves HLS or MP4 over HTTPS.
// Example: 'movie:123': [{id:'torrent-1',name:'تورنت عبر السيرفر',kind:'torrent',streamKind:'hls',url:'https://your-gateway.example/authorized/movie123/master.m3u8'}]
// Do not put magnet: links, info hashes, torrent trackers, or secret backend credentials in this public frontend.
// iPhone Safari can play gateway HLS; browsers cannot reliably play raw torrents directly.
export const playbackSources = {};
