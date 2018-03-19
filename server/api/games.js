const router = require("express").Router();
const { Game, Round, Player } = require("../db/models");
const { Op } = require("sequelize");
const { hasGameEnded, didMafiaWin, whoToSendBack } = require("../game.js");
const OpenTok = require("opentok");

module.exports = router;

router.post("/", (req, res, next) => {
  let opentok = new OpenTok(
    "46081452",
    "3d9f569b114ccfa5ae1e545230656c6adb5465d3"
  );

  opentok.createSession({ mediaMode: "routed" }, function(err, session) {
    if (err) {
      console.log(err);
      res.status(500).send({ error: "createSession error: ", err });
      return;
    }

    let sessionId = session.sessionId;

    Game.create({ ...req.body, sessionId })
      .then(created => {
        res.json(created);
      })
      .catch(next);
  });
});

module.exports = router;

router.get("/", (req, res, next) => {
  Game.findAll({
    where: {
      inProgress: false
    }
  }).then(activeGames => res.json(activeGames));
});

router.post("/newRound/:gameId", (req, res, next) => {
  Round.create()
    .then(round => round.setGame(req.params.gameId))
    .then(currentRound => res.json(currentRound));
});

router.put("/newRound/:gameId", (req, res, next) => {
  //if check to see if it's a mafia making the request, if so:
  let killed = req.body.killed || null;
  //if check to see if it's a doctor making the request, if so:
  let saved = req.body.saved || null;
  let died;
  const gameId = req.params.gameId;
  Round.findOne({
    where: {
      gameId: gameId,
      isCurrent: true
    }
  }).then(round => {
    if (killed && !round.saved) {
      round.update({
        killed: killed
      });
    } else if (saved && !round.killed) {
      round.update({
        saved: saved
      });
    } else if (saved && round.killed) {
      person = whoToSendBack(round.killed, saved);
      const whoDied = person.saved ? null : person.killed;
      round
        .update({
          saved: saved,
          died: whoDied,
          isCurrent: false
        })
        .then(round => {
          if (round.died) {
            Player.update(
              {
                isAlive: false
              },
              {
                where: {
                  gameId: gameId,
                  name: round.died
                }
              }
            );
          }
          return round;
        })
        .then(round => {
          Game.findById(gameId).then(game => {
            if (game.hasEnded()) {
              res.json(game.Winner);
            } else {
              //socket.emit('updateData') and if someone died (if round.died is truthy), send back round.died bc it's their name; else return round.saved and that's the name of who was saved
            }
          });
        });
    } else if (killed && round.saved) {
      person = whoToSendBack(killed, round.saved);
      const whoDied = person.saved ? null : person.killed;
      round
        .update({
          killed: killed,
          died: whoDied,
          isCurrent: false
        })
        .then(round => {
          if (round.died) {
            Player.update(
              {
                isAlive: false
              },
              {
                where: {
                  gameId: gameId,
                  name: round.died
                }
              }
            );
          }
          return round;
        })
        .then(round => {
          Game.findById(gameId).then(game => {
            if (game.hasEnded()) {
              res.json(game.Winner);
            } else {
              //socket.emit('updateData') and if someone died (if round.died is truthy), send back round.died bc it's their name; else return round.saved and that's the name of who was saved
            }
          });
        });
    }
  });
});