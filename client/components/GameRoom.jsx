import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import socket from "../socket";
import { OTSession, OTPublisher, OTStreams, OTSubscriber } from "opentok-react";
import MafiaSelectForm from "./MafiaSelectForm.jsx";
import DetectiveSelectForm from "./DetectiveSelectForm.jsx";
import DoctorSelectForm from "./DoctorSelectForm.jsx";
import DarkCiv from "./DarkCiv.jsx";
import DayTimeForm from "./DayTimeForm.jsx";

import {
  fetchGame,
  user,
  joinExistingGame,
  getMe,
  getPlayersInGame,
  fetchFacts,
  fetchDeaths,
  addVote,
  resetVotes,
  updateUser,
  removePlayer
} from "../store";

const tokboxApiKey = "46081452";
const tokboxSecret = "3d9f569b114ccfa5ae1e545230656c6adb5465d3";

class GameRoom extends Component {
  constructor(props) {
    super(props);

    this.state = {
      time: "",
      error: null,
      connection: "Connecting",
      publishVideo: true,
      resultMessage: "",
      detective: "",
      winner: ""
    };

    this.gameStart = this.gameStart.bind(this);

    this.dark = this.dark.bind(this);
    this.darkOverMafia = this.darkOverMafia.bind(this);
    this.darkOverDetective = this.darkOverDetective.bind(this);
    this.darkOverDoctor = this.darkOverDoctor.bind(this);
    this.assignRole = this.assignRole.bind(this);
    this.daytime = this.daytime.bind(this);
    this.detectiveAnswer = this.detectiveAnswer.bind(this);
    this.sendVotes = this.sendVotes.bind(this);
    this.voteReset = this.voteReset.bind(this);
    this.gameOver = this.gameOver.bind(this);

    this.sessionEventHandlers = {
      sessionConnected: () => {
        this.setState({ connection: "Connected" });
      },
      sessionDisconnected: () => {
        this.setState({ connection: "Disconnected" });
      },
      sessionReconnected: () => {
        this.setState({ connection: "Reconnected" });
      },
      sessionReconnecting: () => {
        this.setState({ connection: "Reconnecting" });
      }
    };

    this.publisherEventHandlers = {
      accessDenied: () => {
        console.log("User denied access to media source");
      },
      streamCreated: () => {
        console.log("Publisher stream created");
      },
      streamDestroyed: ({ reason }) => {
        console.log(`Publisher stream destroyed because: ${reason}`);
      }
    };

    this.subscriberEventHandlers = {
      videoEnabled: () => {
        console.log("Subscriber video enabled");
      },
      videoDisabled: () => {
        console.log("Subscriber video disabled");
      }
    };
  }

  componentDidMount() {
    this.props.fetchCurrentGame();
    this.props.loadData();
    this.props.loadFacts();
    this.props.loadDeaths();

    socket.on("getRoles", this.getRoles);
    socket.on("dark", this.dark);
    socket.on("daytime", payload => {
      this.props.loadData();
      this.daytime(payload);
    });
    socket.on("role", payload => this.assignRole(payload));
    socket.on("DetectiveRight", () => {
      this.detectiveAnswer("right");
    });
    socket.on("DetectiveWrong", () => {
      this.detectiveAnswer("wrong");
    });
    socket.on("myVote", dataVal => {
      this.props.releaseVote(dataVal);
    });
    socket.on("votesData", (votedOut, wasMafia) => {
      console.log(
        "inside votesData socket on front end, person voted out:",
        votedOut
      );
      this.giveVotesData(votedOut, wasMafia);
    });
    socket.on("resetVotes", () => {
      this.voteReset();
    });
    socket.on("gameOver", () => {
      this.gameOver();
    });
  }

  detectiveAnswer(choice) {
    this.setState({ detective: choice });
  }

  daytime(payload) {
    this.setState({ time: "day" });
    this.setState({ detective: "" });

    if (+payload.killed === this.props.user.id) {
      let died = this.props.players.find(player => {
        return +payload.killed === player.id;
      });
      let num = died.id % this.props.deaths.length;
      let death = this.props.deaths[num].storyForKilled;
      this.props.updateUser({
        role: "Dead",
        isAlive: false
      });
      this.setState({
        resultMessage: `${
          this.props.user.name
        } the Mafia got you!! You ${death}`
      });
    }

    if (payload.killed && +payload.killed !== this.props.user.id) {
      let died = this.props.players.find(player => {
        return +payload.killed === player.id;
      });
      let num = died.id % this.props.deaths.length;
      let death = this.props.deaths[num].storyForAll;

      this.setState({
        resultMessage: `${died.name} ${death}`
      });
    }

    if (payload.saved) {
      let saved = this.props.players.find(player => {
        return +payload.saved === player.id;
      });
      this.setState({
        resultMessage: `Nobody died! ${saved.name} was saved by the Doctor`
      });
    }
  }

  gameOver() {
    this.props.fetchCurrentGame();
    this.setState({ winner: this.props.game.winner });
  }

  assignRole(role) {
    this.props.updateUser({
      role: role,
      isAlive: true
    });
  }

  gameStart() {
    socket.emit("gameStart", this.props.game.id);
    //only the creator will have access to this start button
  }

  dark() {
    socket.emit("startDarkTimer");
    this.setState({ time: "dark" });
  }

  darkOverMafia(killedId) {
    socket.emit("darkData", { killed: killedId, gameId: this.props.game.id });
  }

  darkOverDetective(guessId) {
    socket.emit("villagerChoice", {
      guess: guessId,
      gameId: this.props.game.id
    });
  }

  darkOverDoctor(savedId) {
    socket.emit("villagerChoice", {
      saved: savedId,
      gameId: this.props.game.id
    });
  }

  sendVotes(votes) {
    socket.emit("daytimeVotes", votes);
  }

  voteReset() {
    this.props.resetStoreVotes();
  }

  giveVotesData(name, wasMafia) {
    console.log("inside giveVotesData func, name: ", name);
    console.log("was mafia inside giveVotesData", wasMafia);
    //this.props.loadData();
    this.props.removePlayerFromStore(name);
    this.setState({ time: "day2" });
    if (this.props.user.name === name && !wasMafia) {
      this.setState({
        resultMessage:
          "The group guessed you to be the Mafia and were wrong! You are now out of the game."
      });
      this.props.updateUser({
        role: "Dead",
        isAlive: false
      });
    } else if (!this.props.user.name === name && !wasMafia) {
      this.setState({
        resultMessage: `You were wrong! ${name} is not Mafia, and is now out of the game.`
      });
    } else if (this.props.user.name === name && wasMafia) {
      this.setState({
        resultMessage:
          "The group was right! They guessed you as Mafia and you have been voted out the game."
      });
      this.props.updateUser({
        role: "Dead",
        isAlive: false
      });
    } else {
      this.setState({
        resultMessage: `You were right! ${name} was Mafia and is now out of the game.`
      });
    }
  }

  onSessionError = error => {
    this.setState({ error });
  };

  onPublish = () => {
    console.log("Publish Success");
  };

  onPublishError = error => {
    this.setState({ error });
  };

  onSubscribe = () => {
    console.log("Subscribe Success");
  };

  onSubscribeError = error => {
    this.setState({ error });
  };

  toggleVideo = () => {
    this.setState({ publishVideo: !this.state.publishVideo });
  };

  render() {
    const { user, game, players, facts, votes } = this.props;
    const sessionId = game.sessionId;

    const token = user.token;

    const apiKey = "46081452";
    const {
      detective,
      error,
      connection,
      publishVideo,
      role,
      time,
      resultMessage,
      winner
    } = this.state;

    // const newVotes = votes;

    const index = Math.floor(Math.random() * Math.floor(facts.length - 1));

    const messageToMafia =
      "Mafia, you can see and hear everyone, they cannot see you! Discuss your plans freely...";

    return (
      <div className="container">
        <div className="row">
          <div className="col s6">
            <h1>Game: {game.roomName}</h1>
          </div>
          {winner && <h2>{winner} have won!</h2>}
          <div className="col s6">
            {time && <h1>It's {time}!</h1>}
            {user.role &&
              time === "dark" &&
              user.role !== "Dead" && <h2>You're a {user.role}</h2>}
            {user.role &&
              time === "dark" &&
              user.role === "Dead" && <h2>Boo..you're out of the game</h2>}
          </div>
        </div>
        <div className="row">
          {!user.role &&
            user.creator &&
            game.numPlayers === players.length && (
              <button onClick={this.gameStart}>
                Ready? Click here to begin your game of MAFIA
              </button>
            )}
          {time === "dark" &&
            user.role === "Mafia" && <h5>{messageToMafia}</h5>}
        </div>
        <div className="row">
          {Object.keys(votes).length ? (
            <div>
              <table className="votedTable">
                <thead>
                  <tr>
                    <th>Who Voted</th>
                    <th>For Who?</th>
                  </tr>
                </thead>

                <tbody>
                  {Object.keys(votes).map(key => {
                    let whoVotedId = players.find(player => {
                      return player.id === +key;
                    });
                    let whoForId = players.find(player => {
                      return player.id === +votes[key];
                    });
                    return (
                      <tr key={key}>
                        <td>{whoVotedId.name}</td>
                        <td>{whoForId.name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {Object.keys(votes).length == players.length &&
            user.id == +Object.keys(votes)[0] &&
            this.sendVotes(votes)}
        </div>
        <div className="row">
          <div className="col s9">
            {time === "day" &&
              user.role !== "Dead" && (
                <div>
                  <h3>Who do you think the Mafia is?</h3>

                  <DayTimeForm user={user.id} players={players} />
                </div>
              )}
            {time === "dark" &&
              user.role === "Doctor" && (
                <div>
                  <h1>Choose who to save</h1>
                  <DoctorSelectForm
                    players={this.props.players}
                    darkOverDoctor={this.darkOverDoctor}
                  />
                </div>
              )}
            {time === "dark" &&
              user.role === "Detective" &&
              !detective && (
                <div>
                  <h1>Choose who you suspect is Mafia</h1>
                  <DetectiveSelectForm
                    user={user.id}
                    players={this.props.players}
                    darkOverDetective={this.darkOverDetective}
                  />
                </div>
              )}
            {time === "dark" &&
              user.role === "Detective" &&
              detective && <p>Detective, you were {detective}</p>}
            {time === "dark" &&
              user.role === "Lead Mafia" && (
                <div>
                  <h5>{messageToMafia}</h5>
                  <h3>Lead Mafia cast your decided vote below</h3>
                  <MafiaSelectForm
                    players={this.props.players}
                    darkOverMafia={this.darkOverMafia}
                  />
                </div>
              )}

            {time === "dark" &&
              user.role === "Civilian" && (
                <div>
                  <h4>{facts[index].fact}</h4>
                </div>
              )}
          </div>
          <div className="col s3">
            {time === "day" && <h5>{resultMessage}</h5>}
            {time === "day2" && <h5>{resultMessage}</h5>}
          </div>
        </div>
        <div className="row">
          {game.id &&
            user.id && (
              <div>
                <OTSession
                  apiKey={apiKey}
                  sessionId={sessionId}
                  token={token}
                  onError={this.onSessionError}
                  eventHandlers={this.sessionEventHandlers}
                >
                  <OTPublisher
                    properties={{ publishVideo, width: 150, height: 150 }}
                    onPublish={this.onPublish}
                    onError={this.onPublishError}
                    eventHandlers={this.publisherEventHandlers}
                  />
                  <OTStreams>
                    <OTSubscriber
                      properties={{
                        width: 250,
                        height: 250,
                        subscribeToAudio:
                          time === "dark" &&
                          user.role &&
                          user.role !== "Mafia" &&
                          user.role !== "Lead Mafia" &&
                          user.role !== "Dead"
                            ? false
                            : true,
                        subscribeToVideo:
                          time === "dark" &&
                          user.role &&
                          user.role !== "Mafia" &&
                          user.role !== "Lead Mafia" &&
                          user.role !== "Dead"
                            ? false
                            : true
                      }}
                      onSubscribe={this.onSubscribe}
                      onError={this.onSubscribeError}
                      eventHandlers={this.subscriberEventHandlers}
                    />
                  </OTStreams>
                </OTSession>
              </div>
            )}
        </div>
      </div>
    );
  }
}

const mapState = ({ user, game, players, deaths, facts, votes }) => ({
  user,
  game,
  players,
  deaths,
  facts,
  votes
});

const mapDispatch = (dispatch, ownProps) => {
  return {
    fetchCurrentGame() {
      dispatch(fetchGame(+ownProps.match.params.gameId));
    },

    loadData() {
      dispatch(getMe(+ownProps.match.params.gameId));
    },

    loadDeaths() {
      dispatch(fetchDeaths());
    },

    loadFacts() {
      dispatch(fetchFacts());
    },

    releaseVote(dataVal) {
      dispatch(addVote(dataVal));
    },

    resetStoreVotes() {
      dispatch(resetVotes());
    },
    updateUser(data) {
      dispatch(updateUser(data));
    },
    removePlayerFromStore(player) {
      dispatch(removePlayer(player));
    }
  };
};

export default withRouter(connect(mapState, mapDispatch)(GameRoom));

/* PROP TYPES */
GameRoom.propTypes = {
  user: PropTypes.object,
  game: PropTypes.object,
  fetchGame: PropTypes.func,
  getUser: PropTypes.func
};
