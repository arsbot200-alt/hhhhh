const { RTCPeerConnection, RTCAudioSource, RTCVideoSource } = require('wrtc');

async function test() {
    const pc = new RTCPeerConnection();
    const as = new RTCAudioSource();
    const vs = new RTCVideoSource();
    pc.addTrack(as.createTrack());
    pc.addTrack(vs.createTrack());
    
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    console.log(offer.sdp);
}
test();
