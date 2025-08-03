import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
const socket = io.connect(`https://${location.host}:443`);
const divVideoChatLobby = document.getElementById('video-chat-lobby');
const divVideoChat = document.getElementById('video-chat-room');
const joinButton = document.getElementById('join');
const playButton = document.getElementById('play');
const exitButton = document.getElementById('exit');
const nextRoundButton = document.getElementById('next-round');
const userVideo = document.getElementById('user-video');
const peerVideo = document.getElementById('peer-video');
const roomInput = document.getElementById('roomName');
const canvasTableTennis = document.getElementById('table-tennis');
const roomList = document.getElementById('room-list');
const ctx = canvasTableTennis.getContext("2d");
const iceServers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};
const paddleWidth = 100;
const paddleHeight = 20;
const paddleSpeed = 300;
const detectInterval = 50;

let roomName;
let creator = false;
let rtcPeerConnection;
let userStream;
let animationFrameId;
let lastTime;
let lastVideoTime = -1;
let lastDetectTime = -1;
let deltaTime;
let countDown;
let lastCountDown;
let runningMode = "VIDEO";
let faceLandmarker;
let results;
let eyeBlinkLeft;
let eyeBlinkRight;
let userPaddleX = (canvasTableTennis.width - paddleWidth) / 2;
let peerPaddleX = (canvasTableTennis.width - paddleWidth) / 2;
let ballX = canvasTableTennis.width / 2;
let ballY = canvasTableTennis.height / 2;
let ballRadius = 15;
let ballSpeedX=  200;
let ballSpeedY = -200;
let userScore;
let peerScore;
let userHitBoard = false;
let peerHitBoard = false;
let ballHitRight = false;
let ballHitLeft = false;
let gameOver;
let userNextRound = false;
let peerNextRound = false;
let aloneBombMode = false;
let bombX = canvasTableTennis.width / 2;
let bombY = canvasTableTennis.height / 2;
let bombRadius = 15;
let bombSpeedX=  -80;
let bombSpeedY = -180;
let bombUserHitBoard = false;
let bombPeerHitBoard = false;
let bombHitRight = false;
let bombHitLeft = false;

await creatFaceLandmarker();

joinButton.addEventListener("click", () => {
    if (roomInput.value == "" || roomInput.value == "lobby") {
        alert("Please enter a room name");
    } else {
        roomName = roomInput.value;
        socket.emit('join', roomName);
    }
})

socket.on('room-list', (activeRooms) => {
    console.log("test room list");
    roomList.innerHTML = "";
    activeRooms.forEach((room) => {
        const li = document.createElement('li');
        li.textContent = room;
        li.className = "room-item";
        li.onclick = () => {
            roomInput.value = room;
        };
        roomList.appendChild(li);
    })
})

socket.on('created', () => {
    creator = true;

    navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        })
        .then((stream) => {
            userStream = stream;
            divVideoChatLobby.style = "display:none";
            divVideoChat.style = "display:block";
            userVideo.srcObject = stream;
            userVideo.onloadedmetadata = function (e) {
                userVideo.play();
            };
            countDown = 3;
            userScore = 0;
            peerScore = 0;
            gameOver = false;
            animationFrameId = requestAnimationFrame(playGame);
        })
        .catch((err) => {
            alert("Couldn't access user media");
        })
})

socket.on('joined', () => {
    creator = false;

    navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        })
        .then((stream) => {
            userStream = stream;
            divVideoChatLobby.style = "display:none";
            divVideoChat.style = "display:block";
            userVideo.srcObject = stream;
            userVideo.onloadedmetadata = function (e) {
                userVideo.play();
            };
            countDown = 3;
            userScore = 0;
            peerScore = 0;
            gameOver = false;
            animationFrameId = requestAnimationFrame(playGame);
            socket.emit('ready', roomName);
        })
        .catch((err) => {
            alert("Couldn't access user media");
        })
})

socket.on('full', () => {
    alert("Room is Full, can't join");
})

// first person
socket.on('ready', () => {
    if (creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = (event) => {
            console.log("ICE candidate");
            if (event.candidate) {
                socket.emit("candidate", event.candidate, roomName);
            }
        }
        rtcPeerConnection.ontrack = (event) => {
            peerVideo.srcObject = event.streams[0];
            peerVideo.onloadedmetadata = function (e) {
                peerVideo.play();
            };
        }
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
        rtcPeerConnection
            .createOffer()
            .then((offer) => {
                rtcPeerConnection.setLocalDescription(offer);
                socket.emit("offer", offer, roomName);
            })
            .catch((err) => {
                console.log("offer error");
            })
    }
})

// both person receive the candidate of other
socket.on('sendCandidate', (candidate) => {
    rtcPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
})

// second person receiver offer
socket.on('sendOffer', (offer) => {
    if (!creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = (event) => {
            console.log("ICE candidate");
            if (event.candidate) {
                socket.emit("candidate", event.candidate, roomName);
            }
        }
        rtcPeerConnection.ontrack = (event) => {
            peerVideo.srcObject = event.streams[0];
            peerVideo.onloadedmetadata = function (e) {
                peerVideo.play();
            };
        }
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
        rtcPeerConnection.setRemoteDescription(offer);
        rtcPeerConnection
            .createAnswer()
            .then((answer) => {
                rtcPeerConnection.setLocalDescription(answer);
                socket.emit('answer', answer, roomName);
            })
            .catch((err) => {
                console.log("answer error");
            })
    }
})

// first person receive answer
socket.on('sendAnswer', (answer) => {
    rtcPeerConnection.setRemoteDescription(answer);
})

// back to lobby
socket.on('peer-disconnected', () => {
    alert("Your chat partner has left!!");

    backToLobby();
})

exitButton.addEventListener("click", () => {
    backToLobby();
})

function backToLobby() {
    socket.emit("leave-room", roomName);
    creator = false;
    ballX = canvasTableTennis.width / 2;
    ballY = canvasTableTennis.height / 2;
    ballSpeedY = 200;
    countDown = 3;
    lastTime = null;
    lastVideoTime = -1;
    lastDetectTime = -1;
    gameOver = false;
    roomName = null;

    // back to lobby
    divVideoChat.style.display = "none";
    divVideoChatLobby.style.display = "block";

    // stop user stream
    if (userStream) {
        userStream.getTracks().forEach(track => track.stop());
        userVideo.srcObject = null;
    }

    // stop peer stream
    peerVideo.srcObject = null;

    //close RTCPeerConnection
    if (rtcPeerConnection) {
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }

    // clear canvas
    ctx.clearRect(0, 0, canvasTableTennis.width, canvasTableTennis.height);

    // cancel animation frame
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;

    creator = false;
    nextRoundButton.style.display = "none";
    exitButton.style.display = "none";

    socket.emit("leave-room", roomName);
}

// define countDown then run this function
function runCountDown(currentTime) {
    console.log(countDown);
    ctx.fillStyle = "#9810f3ff";
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.fillText(countDown > 0 ? countDown : "Start!", canvasTableTennis.width / 2, canvasTableTennis.height / 2);

    if (creator) {
        if (!lastCountDown) lastCountDown = currentTime;
        const elapsed = (currentTime - lastCountDown) / 1000;
        if (elapsed >= 1) {
            countDown -= 1;
            lastCountDown = currentTime;
        }
        socket.emit('count-down', countDown, roomName);
    }
    
}

socket.on('receive-count-down', (time) => {
    countDown = time;
})

function playGame(currentTime) {
    ctx.clearRect(0, 0, canvasTableTennis.width, canvasTableTennis.height);
    // draw user video
    if (userVideo.readyState >= 2) {
        ctx.drawImage(userVideo, 0, canvasTableTennis.height / 2, canvasTableTennis.width, canvasTableTennis.height / 2);
    }
    if (peerVideo.readyState >= 2) {
        ctx.drawImage(peerVideo, 0, 0, canvasTableTennis.width, canvasTableTennis.height / 2);
    }

    // start to play table tennis
    if (userVideo.readyState >= 2 && peerVideo.readyState >= 2){
        if (countDown >= 0) {
            runCountDown(currentTime);
        } else {
            if (!lastTime) lastTime = currentTime;
            // calculate delta time
            deltaTime = (currentTime - lastTime) / 1000 // second
            lastTime = currentTime;

            // detect whether eye blink or not
            detectEyeBlink();

            // draw canvas
            drawCanvas();

            // update params
            if (creator) {
                creatorUpdateParams();
            } else {
                clientUpdateParams();
            }
        }
        
    }
    if (!gameOver) {
        animationFrameId = requestAnimationFrame(playGame);
    }
    
}

function drawCanvas() {
    // draw user (blue) and peer (green) paddle
    ctx.fillStyle = "blue";
    ctx.fillRect(userPaddleX, canvasTableTennis.height - paddleHeight - 30, paddleWidth, paddleHeight);
    ctx.fillStyle = "green";
    ctx.fillRect(peerPaddleX, 30, paddleWidth, paddleHeight);

    // draw ball
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI*2);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.closePath();

    // draw score
    ctx.fillStyle = "grey";
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.fillText(userScore, canvasTableTennis.width / 2, canvasTableTennis.height / 2 + 40);
    ctx.fillText(peerScore, canvasTableTennis.width / 2, canvasTableTennis.height / 2 - 20);
}

async function creatFaceLandmarker() {
    // set model env
    const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    // set model
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
        modelAssetPath: `face_landmarker.task`,
        delegate: "CPU"
        },
        outputFaceBlendshapes: true,
        runningMode,
        numFaces: 1
    });

}

function detectEyeBlink() {
    // detect whether eye blink or not
    let startTimeMs = performance.now();
    if (startTimeMs - lastDetectTime > detectInterval && lastVideoTime !== userVideo.currentTime) {
        lastVideoTime = userVideo.currentTime;
        lastDetectTime = startTimeMs;
        results = faceLandmarker.detectForVideo(userVideo, startTimeMs);
    }

    eyeBlinkLeft = results?.faceBlendshapes[0]?.categories.find(item => item.categoryName == "eyeBlinkLeft");
    eyeBlinkRight = results?.faceBlendshapes[0]?.categories.find(item => item.categoryName == "eyeBlinkRight");
}

function creatorUpdateParams() {
    // blink to move paddle
    if (eyeBlinkLeft && eyeBlinkRight && (eyeBlinkLeft.score >= 0.3 || eyeBlinkRight.score >= 0.3)) {
        if (eyeBlinkLeft.score - eyeBlinkRight.score > 0.05) userPaddleX -= paddleSpeed * deltaTime;
        if (eyeBlinkRight.score - eyeBlinkLeft.score > 0.05) userPaddleX += paddleSpeed * deltaTime;
    }
    // if (eyeBlinkLeft && eyeBlinkLeft.score >= 0.3) {
    //     userPaddleX -= paddleSpeed;
    // }
    // if (eyeBlinkRight && eyeBlinkRight.score >= 0.3) {
    //     userPaddleX += paddleSpeed;
    // }

    userPaddleX = Math.max(0, Math.min(userPaddleX, canvasTableTennis.width - paddleWidth));

    ballX += ballSpeedX * deltaTime;
    ballY += ballSpeedY * deltaTime;

    // hit the wall
    if (ballX + ballRadius > canvasTableTennis.width) {
        if (!ballHitLeft) {
            ballSpeedX *= -1;
            ballHitLeft = true;
        }
    } else {
        ballHitLeft = false;
    }

    if (ballX - ballRadius < 0) {
        if (!ballHitRight) {
            ballSpeedX *= -1;
            ballHitRight = true;
        }
    } else {
        ballHitRight = false;
    }

    // if (ballY - ballRadius < 0) ballSpeedY *= -1;

    //hit the board
    if (ballY + ballRadius > canvasTableTennis.height - paddleHeight - 30 &&
        ballX > userPaddleX && 
        ballX < userPaddleX + paddleWidth
    ) {
        if (!userHitBoard) {
            ballSpeedY *= -1;
            userHitBoard = true;
            peerHitBoard = false;
        }
    } else {
        userHitBoard = false;
    }

    if (ballY - ballRadius < 30 + paddleHeight && 
        ballX > peerPaddleX && 
        ballX < peerPaddleX + paddleWidth
    ) {
        if (!peerHitBoard) {
            ballSpeedY *= -1;
            peerHitBoard = true;
            userHitBoard = false;
        }
    } else {
        peerHitBoard = false;
    }

    // fall to the ground
    if (ballY + ballRadius > canvasTableTennis.height) {
        resetGame(false);
    }

    // client loose
    if (ballY - ballRadius < 0) {
        resetGame(true);
    }

    socket.emit('send-ball-and-paddle', ballX, ballY, userPaddleX, roomName);
}

function resetGame(win) {
    if (gameOver) return;
    gameOver = true;
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    if (win) {
        socket.emit('peer-lose', roomName);
        alert("Game over! SKR~ Winner 👑!");
        ballX = canvasTableTennis.width / 2;
        ballY = canvasTableTennis.height / 2;
        ballSpeedY = 200;
        lastTime = null;
        userScore += 1;
        countDown = 3;
    } else {
        socket.emit('peer-win', roomName);
        alert("Game over! HA! HA! Loser 😵!");
        ballX = canvasTableTennis.width / 2;
        ballY = canvasTableTennis.height / 2;
        ballSpeedY = -200;
        lastTime = null;
        peerScore += 1;
        countDown = 3;
    }
    nextRoundButton.style.display = "block";
    exitButton.style.display = "block";
    
}

// second person
socket.on('receive-ball-and-paddle', (receiveBallX, receiveBallY, receivePeerPaddleX) => {
    ballX = receiveBallX;
    ballY = canvasTableTennis.height - receiveBallY;
    peerPaddleX = receivePeerPaddleX;
})

// next round button
nextRoundButton.addEventListener("click", () => {
    nextRoundButton.style.backgroundColor = "#7db3ecff";
    nextRoundButton.textContent = "Wait...⏳";
    userNextRound = true;
    socket.emit("ready-next-round", roomName);
    if (userNextRound && peerNextRound) {
        gameOver = false;
        nextRoundButton.textContent = "Next Round 🔜";
        nextRoundButton.style.backgroundColor = "#007bff";
        nextRoundButton.style.display = "none";
        exitButton.style.display = "none";
        userNextRound = false;
        peerNextRound = false;
        animationFrameId = requestAnimationFrame(playGame);
    }
})

// peer push next round button
socket.on("receive-ready-next-round", () => {
    peerNextRound = true;
    if (userNextRound && peerNextRound) {
        gameOver = false;
        nextRoundButton.textContent = "Next Round 🔜";
        nextRoundButton.style.backgroundColor = "#007bff";
        nextRoundButton.style.display = "none";
        exitButton.style.display = "none"
        userNextRound = false;
        peerNextRound = false;
        animationFrameId = requestAnimationFrame(playGame);
    }
})

socket.on("receive-win", () => {
    if (!gameOver) {
        gameOver = true;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        alert("Game over! SKR~ Winner 👑!");
        userScore += 1;
        lastTime = null;
        nextRoundButton.style.display = "block";
        exitButton.style.display = "block";
    }
    
})

socket.on("receive-lose", () => {
    if (!gameOver) {
        gameOver = true;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        alert("Game over! HA! HA! Loser 😵!");
        peerScore += 1;
        lastTime = null;
        nextRoundButton.style.display = "block";
        exitButton.style.display = "block";
    }
})

function clientUpdateParams() {
    // blink to move paddle
    if (eyeBlinkLeft && eyeBlinkRight && (eyeBlinkLeft.score >= 0.3 || eyeBlinkRight.score >= 0.3)) {
        if (eyeBlinkLeft.score - eyeBlinkRight.score > 0.05) userPaddleX -= paddleSpeed * deltaTime;
        if (eyeBlinkRight.score - eyeBlinkLeft.score > 0.05) userPaddleX += paddleSpeed * deltaTime;
    }
    // if (eyeBlinkLeft && eyeBlinkLeft.score >= 0.3) {
    //     userPaddleX -= paddleSpeed;
    // }
    // if (eyeBlinkRight && eyeBlinkRight.score >= 0.3) {
    //     userPaddleX += paddleSpeed;
    // }

    userPaddleX = Math.max(0, Math.min(userPaddleX, canvasTableTennis.width - paddleWidth));
    socket.emit('send-paddle', userPaddleX, roomName);
}

// first person
socket.on('receive-paddle', (receivePeerPaddleX) => {
    peerPaddleX = receivePeerPaddleX;
})


// single mode
playButton.addEventListener("click", () => {
    navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        })
        .then((stream) => {
            userStream = stream;
            divVideoChatLobby.style = "display:none";
            divVideoChat.style = "display:block";
            userVideo.srcObject = stream;
            userVideo.onloadedmetadata = function (e) {
                userVideo.play();
            };
            countDown = 3;
            userScore = 0;
            gameOver = false;
            animationFrameId = requestAnimationFrame(playGameAlone);
        })
        .catch((err) => {
            alert("Couldn't access user media");
        })
})

function playGameAlone(currentTime) {
    ctx.clearRect(0, 0, canvasTableTennis.width, canvasTableTennis.height);
    // draw user video
    if (userVideo.readyState >= 2) {
        ctx.drawImage(userVideo, 0, 0, canvasTableTennis.width, canvasTableTennis.height);
        if (countDown >= 0) {
            runCountDown(currentTime);
            if (!lastCountDown) lastCountDown = currentTime;
            const elapsed = (currentTime - lastCountDown) / 1000;
            if (elapsed >= 1) {
                countDown -= 1;
                lastCountDown = currentTime;
            }
        } else {
            if (!lastTime) lastTime = currentTime;
            // calculate delta time
            deltaTime = (currentTime - lastTime) / 1000 // second
            lastTime = currentTime;

            // detect whether eye blink or not
            detectEyeBlink();

            // draw canvas
            drawCanvasAlone();

            // update params
            aloneUpdateParams();
        }
    }

    

    if (!gameOver) {
        animationFrameId = requestAnimationFrame(playGameAlone);
    }
}

function drawCanvasAlone() {
    // draw user (blue) and peer (green) paddle
    ctx.fillStyle = "blue";
    ctx.fillRect(userPaddleX, canvasTableTennis.height - paddleHeight - 30, paddleWidth, paddleHeight);

    // draw ball
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI*2);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.closePath();

    // draw bomb
    ctx.beginPath();
    ctx.arc(bombX, bombY, bombRadius, 0, Math.PI*2);
    const blinkSpeed = 500; // 每500ms變換一次顏色
    const isYellow = Math.floor(Date.now() / blinkSpeed) % 2 === 0;
    ctx.fillStyle = isYellow ? "yellow" : "black";
    ctx.fill();
    ctx.closePath();

    // draw score
    ctx.fillStyle = "grey";
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.fillText(userScore, canvasTableTennis.width / 2, canvasTableTennis.height / 2 + 30);
}

function aloneUpdateParams() {
    // blink to move paddle
    if (eyeBlinkLeft && eyeBlinkRight && (eyeBlinkLeft.score >= 0.3 || eyeBlinkRight.score >= 0.3)) {
        if (eyeBlinkLeft.score - eyeBlinkRight.score > 0.05) userPaddleX -= paddleSpeed * deltaTime;
        if (eyeBlinkRight.score - eyeBlinkLeft.score > 0.05) userPaddleX += paddleSpeed * deltaTime;
    }

    userPaddleX = Math.max(0, Math.min(userPaddleX, canvasTableTennis.width - paddleWidth));

    ballX += ballSpeedX * deltaTime;
    ballY += ballSpeedY * deltaTime;
    bombX += bombSpeedX * deltaTime;
    bombY += bombSpeedY * deltaTime;


    // hit the wall
    if (ballX + ballRadius > canvasTableTennis.width) {
        if (!ballHitLeft) {
            ballSpeedX *= -1;
            ballHitLeft = true;
        }
    } else {
        ballHitLeft = false;
    }

    if (ballX - ballRadius < 0) {
        if (!ballHitRight) {
            ballSpeedX *= -1;
            ballHitRight = true;
        }
    } else {
        ballHitRight = false;
    }

    if (ballY - ballRadius < 0) {
        if (!peerHitBoard) {
            ballSpeedY *= -1;
            peerHitBoard = true;
        }
    } else {
        peerHitBoard = false;
    }

    if (bombX + bombRadius > canvasTableTennis.width) {
        if (!bombHitLeft) {
            bombSpeedX *= -1;
            bombHitLeft = true;
        }
    } else {
        bombHitLeft = false;
    }

    if (bombX - bombRadius < 0) {
        if (!bombHitRight) {
            bombSpeedX *= -1;
            bombHitRight = true;
        }
    } else {
        bombHitRight = false;
    }

    if (bombY - bombRadius < 0) {
        if (!peerHitBoard) {
            bombSpeedY *= -1;
            bombPeerHitBoard = true;
        }
    } else {
        bombPeerHitBoard = false;
    }

    // if (ballY - ballRadius < 0) ballSpeedY *= -1;

    //hit the board
    if (ballY + ballRadius > canvasTableTennis.height - paddleHeight - 30 &&
        ballX > userPaddleX && 
        ballX < userPaddleX + paddleWidth
    ) {
        if (!userHitBoard) {
            ballSpeedY *= -1;
            userHitBoard = true;
            peerHitBoard = false;
            userScore += 1;
        }
    } else {
        userHitBoard = false;
    }

    // ball fail to ground
    if (ballY + ballRadius > canvasTableTennis.height) {
        aloneOver();
    } 

    // fail to ground
    if (bombY + bombRadius > canvasTableTennis.height) {
        if (!peerHitBoard) {
            bombSpeedY *= -1;
            bombUserHitBoard = true;
        }
    } else {
        bombUserHitBoard = false;
    }
    // touch bomb
    if (bombX + bombRadius > userPaddleX &&
        bombX - bombRadius < userPaddleX + paddleWidth &&
        bombY + bombRadius > canvasTableTennis.height - paddleHeight - 30 && bombY - bombRadius < canvasTableTennis.height - 30
    ) {
        aloneOver();
    }

}

function aloneOver() {
    alert(`Game over! SKR~ You earn ${userScore} 👑!`);
    ballX = canvasTableTennis.width / 2;
    ballY = canvasTableTennis.height / 2;
    ballSpeedY = 200;
    lastTime = null;
    userScore = 0;
    countDown = 3;
    bombX = canvasTableTennis.width / 2;
    bombY = canvasTableTennis.height / 2;
    bombRadius = 15;
    bombSpeedX=  -80;
    bombSpeedY = -180;
    let confirmResult = confirm("Do you want to play again?");
    if (!confirmResult) {
        lastVideoTime = -1;
        lastDetectTime = -1;
        divVideoChat.style.display = "none";
        divVideoChatLobby.style.display = "block";
        // stop user stream
        if (userStream) {
            userStream.getTracks().forEach(track => track.stop());
            userVideo.srcObject = null;
        }
        // clear canvas
        ctx.clearRect(0, 0, canvasTableTennis.width, canvasTableTennis.height);

        // cancel animation frame
        gameOver = true;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}