import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
const player1_camera = document.getElementById('player1_camera');
const canvas = document.getElementById('table_tennis');
const ctx = canvas.getContext("2d");
const paddleWidth = 100;
const paddleHeight = 20;
const paddleSpeed = 5;
let runningMode = "VIDEO";
let faceLandmarker;
let results;
let eyeBlinkLeft;
let eyeBlinkRight;
let paddleX = (canvas.width - paddleWidth) / 2;
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballRadius = 10;
let ballSpeedX=  1;
let ballSpeedY = -1;


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

let lastVideoTime = -1;

async function detectEyeBlink() {
    let startTimeMs = performance.now();
    if (lastVideoTime !== player1_camera.currentTime) {
        lastVideoTime = player1_camera.currentTime;
        results = faceLandmarker.detectForVideo(player1_camera, startTimeMs);
    }

    eyeBlinkLeft = results?.faceBlendshapes[0]?.categories.find(item => item.categoryName == "eyeBlinkLeft");
    eyeBlinkRight = results?.faceBlendshapes[0]?.categories.find(item => item.categoryName == "eyeBlinkRight");

    // Call this function again to keep predicting when the browser is ready
    window.requestAnimationFrame(detectEyeBlink);
}

detectEyeBlink();

function playGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw player1_camera
    ctx.drawImage(player1_camera, 0, 0, canvas.width, canvas.height);

    // draw paddle
    ctx.fillStyle = "blue";
    ctx.fillRect(paddleX, canvas.height - paddleHeight - 10, paddleWidth, paddleHeight);

    // blink to move paddle
    // if (eyeBlinkLeft && eyeBlinkRight) {
    //     if (eyeBlinkLeft.score - eyeBlinkRight.score > 0.1) paddleX -= paddleSpeed;
    //     if (eyeBlinkRight.score - eyeBlinkLeft.score > 0.1) paddleX += paddleSpeed;
    // }
    if (eyeBlinkLeft && eyeBlinkLeft.score >= 0.3) {
        paddleX -= paddleSpeed;
    }
    if (eyeBlinkRight && eyeBlinkRight.score >= 0.3) {
        paddleX += paddleSpeed;
    }

    paddleX = Math.max(0, Math.min(paddleX, canvas.width - paddleWidth));

    // draw ball
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI*2);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.closePath();

    ballX += ballSpeedX;
    ballY += ballSpeedY;

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
        ballSpeedY = -1;
    }
    window.requestAnimationFrame(playGame);
}

playGame();