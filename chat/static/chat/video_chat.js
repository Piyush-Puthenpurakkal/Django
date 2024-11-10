const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const toggleVideoButton = document.getElementById('toggleVideo');
const toggleAudioButton = document.getElementById('toggleAudio');

let localStream;
let peerConnection;
let roomName = JSON.parse(document.getElementById('room-name').textContent);
let wsStart = window.location.protocol == "https:" ? "wss://" : "ws://";
let ws = new WebSocket(wsStart + window.location.host + "/ws/chat/" + roomName + "/");

const configuration = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"  // Public Google STUN server
        }
    ]
};

// Start local video and audio
async function startVideoChat() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;

        // Initialize WebRTC peer connection
        peerConnection = new RTCPeerConnection(configuration);

        // Add local tracks to the connection
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        // Handle ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                ws.send(JSON.stringify({
                    type: "new-ice-candidate",
                    candidate: event.candidate
                }));
            }
        };

        // Display remote stream when received
        peerConnection.ontrack = event => {
            remoteVideo.srcObject = event.streams[0];
        };

        // Listen for messages from WebSocket server
        ws.onmessage = event => {
            const data = JSON.parse(event.data);

            if (data.type === "offer") {
                handleOffer(data.offer);
            } else if (data.type === "answer") {
                handleAnswer(data.answer);
            } else if (data.type === "new-ice-candidate") {
                handleNewICECandidate(data.candidate);
            }
        };

        // Send WebRTC offer to other peer
        peerConnection.onnegotiationneeded = async () => {
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                ws.send(JSON.stringify({
                    type: "offer",
                    offer: offer
                }));
            } catch (err) {
                console.error("Error creating an offer: ", err);
            }
        };

    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
}

// Handle received WebRTC offer
async function handleOffer(offer) {
    try {
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        ws.send(JSON.stringify({
            type: "answer",
            answer: answer
        }));
    } catch (err) {
        console.error("Error handling offer: ", err);
    }
}

// Handle received WebRTC answer
async function handleAnswer(answer) {
    try {
        await peerConnection.setRemoteDescription(answer);
    } catch (err) {
        console.error("Error handling answer: ", err);
    }
}

// Handle received ICE candidates
async function handleNewICECandidate(candidate) {
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (err) {
        console.error("Error adding received ICE candidate: ", err);
    }
}

// Toggle video stream
toggleVideoButton.addEventListener('click', () => {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    toggleVideoButton.textContent = videoTrack.enabled ? 'Disable Video' : 'Enable Video';
});

// Toggle audio stream
toggleAudioButton.addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    toggleAudioButton.textContent = audioTrack.enabled ? 'Disable Audio' : 'Enable Audio';
});

// Start video chat when the page loads
startVideoChat();
