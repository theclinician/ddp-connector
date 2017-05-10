#!/bin/bash
(
  cd ..
  npm run build
)
tmux new-session -d -n "example" -s example
tmux source-file .tmux.conf
tmux new-window -n "server" -t example:1
tmux new-window -n "client" -t example:2
tmux send-keys -t example:1 "cd server" C-m
tmux send-keys -t example:1 "meteor --port 4000" C-m
tmux send-keys -t example:2 "cd client" C-m
tmux send-keys -t example:2 "npm run start" C-m
tmux attach-session -d
