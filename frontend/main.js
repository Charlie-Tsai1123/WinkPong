import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
const socket = new WebSocket(`wss://${location.host}`);
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
const player1_camera = document.getElementById('player1_camera');
const canvas = document.getElementById('table_tennis');
const ctx = canvas.getContext("2d");
const paddleWidth = 100;
const paddleHeight = 20;
const paddleSpeed = 300;
const detectInterval = 50;
let lastTime = performance.now();
let runningMode = "VIDEO";
let faceLandmarker;
let results;
let eyeBlinkLeft;
let eyeBlinkRight;
let paddleX = (canvas.width - paddleWidth) / 2;
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballRadius = 10;
let ballSpeedX=  150;
let ballSpeedY = -150;


async function openCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        player1_camera.srcObject = stream;
    } catch (err) {
        console.error('Cannot open the camera', err);
        alert('Please allow the camera to open!');
    }
}

async function creatFaceLandmarker() {
    // set model env
    const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    // set model
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode,
        numFaces: 1
    });

}

await openCamera();
await creatFaceLandmarker();

// function resizeCanvasToScreen() {
//     const dpr = window.devicePixelRatio || 1;
//     canvas.width = window.innerWidth * dpr;
//     canvas.height = window.innerHeight * dpr * 0.8;
//     canvas.style.width = window.innerWidth + 'px';
//     canvas.style.height = window.innerHeight + 'px';
//     // ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

//     paddleX = (canvas.width / dpr - paddleWidth) / 2;
//     ballX = canvas.width / dpr / 2;
//     ballY = canvas.height / dpr / 2;
// }


// resizeCanvasToScreen();
// window.addEventListener('resize', resizeCanvasToScreen);

let lastVideoTime = -1;
let lastDetectTime = -1;

function playGame(currentTime) {
    // calculate delta time
    const deltaTime = (currentTime - lastTime) / 1000; // second
    lastTime = currentTime;

    // detect whether eye blink or not
    let startTimeMs = performance.now();
    if (startTimeMs - lastDetectTime > detectInterval && lastVideoTime !== player1_camera.currentTime) {
        lastVideoTime = player1_camera.currentTime;
        lastDetectTime = startTimeMs;
        results = faceLandmarker.detectForVideo(player1_camera, startTimeMs);
    }

    eyeBlinkLeft = results?.faceBlendshapes[0]?.categories.find(item => item.categoryName == "eyeBlinkLeft");
    eyeBlinkRight = results?.faceBlendshapes[0]?.categories.find(item => item.categoryName == "eyeBlinkRight");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw player1_camera
    if (player1_camera.readyState >= 2) {
        ctx.drawImage(player1_camera, 0, 0, canvas.width, canvas.height);
    }
    // ctx.drawImage(player1_camera, 0, 0, canvas.width, canvas.height);

    // draw paddle
    ctx.fillStyle = "blue";
    ctx.fillRect(paddleX, canvas.height - paddleHeight - 10, paddleWidth, paddleHeight);

    // blink to move paddle
    if (eyeBlinkLeft && eyeBlinkRight && (eyeBlinkLeft.score >= 0.3 || eyeBlinkRight.score >= 0.3)) {
        if (eyeBlinkLeft.score - eyeBlinkRight.score > 0.05) paddleX -= paddleSpeed * deltaTime;
        if (eyeBlinkRight.score - eyeBlinkLeft.score > 0.05) paddleX += paddleSpeed * deltaTime;
    }
    // if (eyeBlinkLeft && eyeBlinkLeft.score >= 0.3) {
    //     paddleX -= paddleSpeed;
    // }
    // if (eyeBlinkRight && eyeBlinkRight.score >= 0.3) {
    //     paddleX += paddleSpeed;
    // }

    paddleX = Math.max(0, Math.min(paddleX, canvas.width - paddleWidth));

    // draw ball
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI*2);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.closePath();

    ballX += ballSpeedX * deltaTime;
    ballY += ballSpeedY * deltaTime;

    // hit the wall
    if (ballX + ballRadius > canvas.width || ballX - ballRadius < 0) ballSpeedX *= -1;
    if (ballY - ballRadius < 0) ballSpeedY *= -1;

    //hit the board
    if (ballY + ballRadius > canvas.height - paddleHeight - 10 &&
        ballX > paddleX && ballX < paddleX + paddleWidth
    ) {
        ballSpeedY *= -1;
    }

    // fall to the ground
    if (ballY + ballRadius > canvas.height) {
        alert("Game over 😵!");
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballSpeedY = -100;
        lastTime = performance.now();
    }
    window.requestAnimationFrame(playGame);
}

window.requestAnimationFrame(playGame);