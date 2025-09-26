<p align=center>
<img src="https://github.com/user-attachments/assets/9abae55d-380e-49fc-9405-8a6b7b6bc065" alt="Banner">
</p>

<p align=center>
  <img src="https://img.shields.io/github/package-json/v/Charlie-Tsai1123/WinkPong?filename=backend/package.json" />
  <img src="https://img.shields.io/badge/node.js-v22.17.1-green.svg">
  <img src="https://img.shields.io/badge/express-v5.1.0-orange.svg">
  <img src="https://img.shields.io/badge/socket.io-v4.8.1-yellow.svg">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg">
</p>

Play ping pong game by blink your eyes. Use socket to connect with others, both of you can play while chat with each others. You can create room to invite your friends play with you.
>More stable if both players use the same wifi.

## Install
There are two ways:
1. **Play in the website i built in Render. 👉 [here](https://winkpong.onrender.com) 👈**
2. Build server on your own and play with the same wifi. (below)


**Make sure you have install [Node.js](https://nodejs.org/zh-tw) already.**
</br></br>
Git clone the project
```
git clone git@github.com:Charlie-Tsai1123/WinkPong.git
```

Create your own public certs key (let it run at https)
```
cd WinkPong/backend/
```
```
mkdir -p certs
```
```
openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=localhost"
```

Run your server (**Server is in backend folder**)
```
node server.js
```

Then, **open the other terminal to check your Wi-Fi IPv4 position**
```
ipconfig
```

Lastly, replace *localhost* to *your ip* eg:
https://localhost:443 --> https://192.168.6.59:443
</br>
</br>
🎉Server build successfully🎉
</br>
</br>
Enter the website and allow video and audio, then you can play ping pong🏓 by your eyes😉.
>It will be unsafe website, you have to enter it by click advanced option, then click proceed to the website.

## Usage
‼️ Allow using camera and microphone.

### 🏓Play With Others
#### How to Play
Just blink your eyes to move paddle to catch the ball. Don't let it fall on the ground!

https://github.com/user-attachments/assets/21b3b783-4474-49b1-ae14-4c96d8584547

#### How to Join
##### Room Creator
Type room name in 😉Play with others🏓 column, then click join.

https://github.com/user-attachments/assets/d42bc21a-e3b8-4aec-b40d-3af2dc2edfb7

##### Room Participant
Click any room you want to join in Available Room.

https://github.com/user-attachments/assets/3ddbb520-fb10-4ceb-8530-7adcf976fcb9

### 🏓Play Alone
Black ball is bomb💣, don't touch it. Red ball is table tennis ball🟡, don't miss it.

https://github.com/user-attachments/assets/60fc75bd-8f73-4c10-9ae7-e3f721c413b1





