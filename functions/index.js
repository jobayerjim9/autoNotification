const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// schedule("0 8 * * *")
// schedule("every 5 minutes")
admin.initializeApp();
let header;
let userPosition=0;
const users = [];
const processData =
    (body, totalCount, willSend, child, followedVal,
        position, resolve, token) => {
      if (position<followedVal.length) {
        const followedId = followedVal[position];
        const url = "https://api.spotify.com/v1/artists/" + followedId + "/albums?limit=50&include_groups=album,single,appears_on";
        return new Promise((resolve, reject) => {
          let lastArtistName = "";
          axios.get(url, header)
              .then((response) => {
                  let artistAlreadyFound = false;
                  const items = response.data["items"];
                for (let i = 0; i < items.length; i++) {
                  const item = items[i];
                  const releaseDate =
                            // eslint-disable-next-line max-len
                            new Date(item["release_date"].toString());
                  const today = new Date();
                  const diffTime =
                            Math.abs(today - releaseDate);
                    const diffDays =
                        // eslint-disable-next-line max-len
                        Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const artists = item["artists"];
                  if (diffDays <= 1 && diffDays>=0) {
                    for (let j = 0; j < artists.length; j++) {
                      if (followedId === artists[j].id) {
                        // eslint-disable-next-line max-len
                          willSend = true;
                          artistAlreadyFound = true;
                        if (!body.includes(artists[j].name)) {
                          totalCount++;
                          if (totalCount <= 2) {
                              if (totalCount === 1) {
                                  body = body + " " + artists[j].name + ",";
                              } else {
                                  body = body + " " + artists[j].name;
                              }
                          }
                            console.log("artistName " + body);
                        }
                      }
                    }
                  } else {
                      for (let j = 0; j < artists.length; j++) {
                          if (followedId === artists[j].id) {
                              lastArtistName = artists[j].name;
                          }
                      }
                  }
                }
                  if (!artistAlreadyFound) {
                      const fUrl = "https://api.spotify.com/v1/artists/" + followedId + "/albums?limit=50&include_groups=appears_on";
                      axios.get(fUrl, header)
                          .then((response) => {
                              const items = response.data["items"];
                              for (let i = 0; i < items.length; i++) {
                                  const item = items[i];
                                  const releaseDate =
                                      // eslint-disable-next-line max-len
                                      new Date(item["release_date"].toString());
                                  const today = new Date();
                                  const diffTime =
                                      Math.abs(today - releaseDate);
                                  const diffDays =
                                      // eslint-disable-next-line max-len
                                      Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  if (diffDays <= 1 && diffDays >= 0) {
                                      const artists = item["artists"];
                                      if (artists[0].name !== "Various Artists") {
                                          willSend = true;
                                          if (!body.includes(lastArtistName)) {
                                              totalCount++;
                                              if (totalCount <= 2) {
                                                  if (totalCount === 1) {
                                                      body = body + " " + lastArtistName + ",";
                                                  } else {
                                                      body = body + " " + lastArtistName;
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                              processData(body,
                                  totalCount,
                                  willSend,
                                  child,
                                  followedVal,
                                  position + 1,
                                  resolve,
                                  token
                              );
                          }).catch((err) => {
                          if (position === followedVal.length) {
                              iterateByUser(users, userPosition + 1, resolve);
                          } else {
                              processData(body,
                                  totalCount,
                                  willSend,
                                  child,
                                  followedVal,
                                  position + 1,
                                  resolve,
                                  token
                              );
                          }
                          console.log("processDataError " + err.data);
                      });
                  } else {
                      processData(body,
                          totalCount,
                          willSend,
                          child,
                          followedVal,
                          position + 1,
                          resolve,
                          token
                      );
                  }
              }).catch((err) => {
                if (position===followedVal.length) {
                  iterateByUser(users, userPosition + 1, resolve);
                } else {
                  processData(body,
                      totalCount,
                      willSend,
                      child,
                      followedVal,
                      position + 1,
                      resolve,
                      token
                  );
                }
                console.log("processDataError "+err.data);
              });
        });
      } else {
        if (willSend) {
          const titleT = "New Music Released Today";
          if (totalCount===1) {
            body=body.replace(",", "");
          }
          totalCount = totalCount - 2;
          if (totalCount > 0) {
            body = body + " and " + totalCount + " More";
          }
          const payload = {
            data: {
              title: titleT,
              body: body,
            },
          };
          admin.messaging()
              .sendToDevice(token, payload);
          console
              .log("noti sent" +
                      token);
          console.log("payload " + body);
        }
        console.log("outside "+position+" "+userPosition);
          if (userPosition >= users.length) {
              resolve("200");
          } else {
              iterateByUser(users, userPosition + 1, resolve);
          }
      }
    };

const iterateByUser = (users, position, resolve) => {
  userPosition=position;
  if (position<users.length) {
    userPosition=position;
    const child=users[position];
    const tokenL = child
        .child("notificationToken").val();
    console.log("executing "+tokenL);
    const body="Music by";
    const totalCount=0;
    const willSend = false;
    const followed=child.child("followedArtists");
    if (followed.hasChildren()) {
      // eslint-disable-next-line max-len
      const followedVal=child.child("followedArtists").val();
      processData(body,
          totalCount,
          willSend,
          child,
          followedVal,
          0,
          resolve,
          tokenL
      );
    } else {
        iterateByUser(users, userPosition + 1, resolve);
    }
  } else {
      resolve("200");
  }
};
// schedule("0 8 * * *")
// schedule("every 5 minutes")
exports.autoNotification =
    functions.pubsub.schedule("0 8 * * *")
        .timeZone("Europe/London").onRun((context) => {
        const root = admin.database().ref();
        const params = new URLSearchParams();
        params.append("grant_type", "client_credentials");
        // eslint-disable-next-line max-len
        const basicToken = "Basic OWJlYjRiZDI4MDQ4NGRhZDkxODYzZDE5NDFkZGQ3OTg6OGZjODc0ODQ1MDk1NGE3ZmIxYWUyZTI5OWQzMTI0NTE=";
        const config = {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": basicToken,
            },
          };
          return new Promise((resolve, reject) => {
            axios.post("https://accounts.spotify.com/api/token", params, config)
                .then((result) => {
                  const accessToken= "Bearer "+result.data.access_token;
                  header = {
                    headers: {
                      "Authorization": accessToken,
                    },
                  };

                  root.child("userInfo").once("value").then((snap) => {
                    if (snap.hasChildren()) {
                      snap.forEach((child)=> {
                        users.push(child);
                      });
                      iterateByUser(users, 0, resolve);
                    }
                  });
                })
                .catch((err) => {
                  console.log(err.data);
                });
          });

          // eslint-disable-next-line max-len

          // fetch("https://accounts.spotify.com/api/token", {
          //   method: "POST",
          //   headers: {
          //     "Content-Type": "application/x-www-form-urlencoded",
          //     "Authorization": basicToken,
          //   },
          //   body: new URLSearchParams({
          //     "grant_type": "client_credentials",
          //   }),
          // }).then((response) => {
          //   const respJson=response.json();
          //   console.log(respJson.toString());
          // });
        });
