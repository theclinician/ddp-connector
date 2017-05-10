# Todo example

Before you can run the example app, you first need to transpile `ddp-connector` package.
In order to do so, please run
```
npm run build
```
from the root directory of this repo. The `server` app depends on
[meteor](https://www.meteor.com/install), so please make sure it's installed.

To run the example app, use
```
./start.sh
```
if you have `tmux` installed, or
```
cd server
meteor npm install
meteor --port 4000

cd client
npm install
npm run start
```
