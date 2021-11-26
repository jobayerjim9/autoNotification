const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// schedule("0 11 * * *")
admin.initializeApp();

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
                  const header = {
                    headers: {
                      "Authorization": accessToken,
                    },
                  };
                  axios.get("https://api.spotify.com/v1/browse/new-releases?limit=50", header)
                      .then((response) => {
                        const albums=response.data["albums"];
                        root.child("userInfo").once("value").then((snap) => {
                          if (snap.hasChildren()) {
                            snap.forEach((child)=> {
                              for (let i =0; i<albums.items.length; i++) {
                                const item=albums.items[i];
                                const releaseDate =
                                new Date(item["release_date"].toString());
                                console.log("releaseDate "+releaseDate);
                                const today = new Date();
                                const diffTime = Math.abs(today - releaseDate);
                                const diffDays =
                                Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                console.log(diffDays);
                                if (diffDays<=1) {
                                  const followed=child.child("followedArtists");
                                  if (followed.hasChildren()) {
                                    const artists=item["artists"];
                                    followed.forEach((followedArtists)=> {
                                      const followedId= followedArtists.val();
                                      console.log(followedId);
                                      for (let j=0; j<artists.length; j++) {
                                        if (followedId === artists[j].id) {
                                          // eslint-disable-next-line max-len
                                          const titleT=`New Music/Album Released from ${artists[j].name}`;
                                          const payload = {
                                            data: {
                                              title: titleT,
                                              body: item.name,
                                              albumId: item.id,
                                            },
                                          };
                                          const token= child
                                              .child("notificationToken").val();
                                          admin.messaging()
                                              .sendToDevice(token, payload);
                                        }
                                      }
                                    });
                                  }
                                }
                              }
                            });
                          }
                        });
                      });
                  console.log(result.data.access_token);
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
