var express = require('express');
var ejs=require("ejs");
var session=require('express-session');
var mongodb=require('mongodb');
var app = express();
var twitterAPI = require('node-twitter-api');
var twitter = new twitterAPI({
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
    callback: 'https://votesapp.glitch.me/sign_in'
});
var bodyParser = require('body-parser');

app.set('view engine', 'ejs');  
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({secret: process.env.SESSION_SECRET}));

app.get("/", function (request, response) {
  var ip=request.headers["x-forwarded-for"].toString().split(",")[0];
  var user=request.session.user;
  if(!user && loggedin[ip]){
    user=loggedin[ip];
  }
  
  mongodb.MongoClient.connect(process.env.DB_URL,function(err,db){
    if(err){
      db.close();
      response.render(__dirname + '/views/all_polls.ejs',{user:null,title:[]});
      throw err;
    } else{
      var titles=[];
      db.collection('votesapp').find({type:"poll"}).each(function(err,doc){
        if(err){
          db.close();
          response.render(__dirname + '/views/all_polls.ejs',{user:null,title:[]});
          throw err;
        }else{
          if(doc!=null){
            titles.push({title:doc.title,id:doc._id});
          }else{
            response.render(__dirname + '/views/all_polls.ejs',{user:user,titles:titles});
            db.close();
          }
        }
      });
    }
  });
});

var reqs={};
var loggedin={};

app.post("/add_option",function(req,res){
  if(req.session.user){
    mongodb.MongoClient.connect(process.env.DB_URL,function(err,db){
    if(err){
      res.send({"error":"error"});
      throw err;
    }else{
      var collectn=db.collection("votesapp");
      collectn.findOne({title:req.session.title},function(err,doc){
        if(err){
          res.send({"error":"error"});
          throw err;
        }
        if(doc!=null){
          if(doc.choice.hasOwnProperty(req.body.option)){
            res.send({"error":"Option already provided in the poll."});
            db.close();
          }else{
            var q={};
            q["choice."+req.body.option]=0;
            collectn.update({title:req.session.title},{$set:q},function(err,result){
              if(err){
                res.send({"error":"error"});
                throw err;
              }else{
                res.send("Option added.");
                db.close();
              }
            });
          }
        }
      });
    }
  });
  }else{
    res.send({"error":"Sign in to add an option."});
  }
  
});

app.post("/delete_poll",function(req,res){
  if(req.session.user){
    if(req.session.user.id_str==req.session.poll_creator){
      mongodb.MongoClient.connect(process.env.DB_URL,function(err,db){
        if(err){
          res.send({"error":"error"});
          throw err;
        }else{
          db.collection('votesapp').deleteOne({title:req.session.title},function(err,result){
            if(err){
              throw err;
            }else{
              res.send("Poll deleted.");
              db.close();
            }
          });
        }
      });
    }else{
      res.send({error:"You cannot delete this poll."});
    }
  }else{
    res.send({error:"Sign in to delete the polls that you created."});
  }
});

app.get("/my_polls",function(req,res){
  if(req.session.user){
    mongodb.MongoClient.connect(process.env.DB_URL,function(err,db){
      if(err){
        res.render(__dirname + '/views/my_polls.ejs',{user:null,my_polls:[],error:"An error occured, please try again."});
        throw err;
      }else{
        var polls=[];
        db.collection('votesapp').find({creator:req.session.user.id_str}).each(function(err,doc){
          if(err){
            res.render(__dirname + '/views/my_polls.ejs',{user:null,my_polls:[],error:"An error occured, please try again."});
            throw err;
          }
          if(doc!=null){
            polls.push({title:doc.title,id:doc._id});
          }else{
            res.render(__dirname + '/views/my_polls.ejs',{user:req.session.user,my_polls:polls});
            db.close();
          }
        });
      }
    });
  }else{
    res.render(__dirname + '/views/my_polls.ejs',{user:null,my_polls:[],error:"Sign in to view your polls."});
  }
});

app.get("/polls/*",function(req,res){
  var id=req.path.substring(7);
  var poll=null;
  mongodb.MongoClient.connect(process.env.DB_URL,function(err,db){
    if(err){
      throw err;
      res.send(null);
    }
    db.collection('votesapp').findOne({_id:mongodb.ObjectId(id)},function(err,doc){
      if(err){
        throw err;
        res.send(null);
      }
      if(doc!=null){
        var uid=null;
        if(req.session.user) uid=req.session.user.id;
        var res_obj={user:req.session.user,title:doc.title,choice:doc.choice,creator:(parseInt(doc.creator)==uid)};
        req.session.title=doc.title;
        req.session.poll_creator=doc.creator;
        res.render(__dirname + '/views/view_poll.ejs',res_obj);
      }else{
        res.send(null);
      }
      db.close();
    });
  });
});

app.post("/vote",function(req,res){
  var id=req.headers["x-forwarded-for"].toString().split(",")[0];
  var poll={title:req.session.title,option:req.body.choice};
  if(req.session.user){
    id=req.session.user.id;
  }
  mongodb.MongoClient.connect(process.env.DB_URL,function(err,db){
    if(err){
      res.send({"error":"error"});
      throw err;
    }else{
      var collectn=db.collection('votesapp');
      collectn.findOne({title:poll.title},function(err,doc){
        if(err){
          res.send({"error":"error"});
          throw err;
        }else{
          if(doc!=null){
            if(doc.voters.indexOf(id)!=-1){
              res.send({"error":"Already voted."});
            }else{
              var ch='choice.'+poll.option;
              var query={$inc:{}};
              query.$inc[ch]=1;
              collectn.updateOne({title:poll.title},query,function(err,result){
                if(err){
                  res.send({"error":"error"});
                  throw err;
                }else{
                  collectn.updateOne({title:poll.title},{$push:{voters:id}},function(err,result){
                    if(err){
                      res.send({"error":"error"});
                      throw err;
                    }else{
                      res.send("Voted");
                    }
                    db.close();
                  });
                }
              });
            }
          }else{
            res.send({"error":"error"});
          }
        }
      });
    }
  });
});

app.get("/new_poll",function(req,res){
  res.render(__dirname+"/views/new_poll.ejs",{user:req.session.user});
});

app.post("/create_new_poll",function(request,response){
  if(request.session.user){
    var poll={title:request.body.title,choice:JSON.parse(request.body.choice),type:"poll",voters:[],creator:request.session.user.id_str};
    mongodb.MongoClient.connect(process.env.DB_URL,function(err,db){
      if(err) throw err;
      var collectn=db.collection('votesapp');
      collectn.find({title:poll.title}).count(function(err,count){
        if(count==0){
          collectn.insertOne(poll,function(err,result){
            if(err){
              response.send({error:"error"});
              throw err;
            }else{
              response.send({id:result.insertedId});
            }
          });
        }else{
          response.send({error:"Poll already exists."});
        }
        db.close();
      });
    });
  }else{
    response.send({error:"Sign in to create a poll."});
  }
});

app.post("/sign_in_request",function(req,response){
  var ip=req.headers["x-forwarded-for"].toString().split(",")[0];
  if(loggedin[ip]){
    response.send(loggedin[ip]);
  }else{
    twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results){
        if (error) {
          response.send({"error":error})
        } else {
          reqs[requestToken]={secret:requestTokenSecret,response:response};
          response.send(requestToken);
        }
    });
  }
});

app.get("/sign_in",function(request,response){
  var requestToken = request.query.oauth_token,
  verifier = request.query.oauth_verifier;
  if(requestToken){
    var secret=reqs[requestToken].secret;
    var res=reqs[requestToken].response;
    var reqq=reqs[requestToken].request;
    twitter.getAccessToken(requestToken, secret, verifier, function(err, accessToken, accessSecret) {
      if (err){
        response.send("<html><body>"+err+"</body></html>");
        res.send({error_fetching_user:"error"});
      }else{
        response.send("<html><body><script language='javascript'>window.close();</script></body></html>");
        twitter.verifyCredentials(accessToken, accessSecret, function(err, user) {
            if (err){
              res.send({"error_fetching_user":"error"});
            }else{
              reqq.session.user=user;
              res.send({user:user});
              loggedin[reqq.headers["x-forwarded-for"].toString().split(",")[0]]=user;
            }
        });
      }
    });
  }
});

app.post("/get_user",function(request,response){
  reqs[request.body.tok].response=response;
  reqs[request.body.tok].request=request;
});

app.post("/sign_out",function(req,res){
  var ip=req.headers["x-forwarded-for"].toString().split(",")[0];
  var sessionv=req.session;
  sessionv.user=null;
  req.session.destroy();
  req.session=sessionv;
  delete loggedin[ip];
  res.send(true);
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
