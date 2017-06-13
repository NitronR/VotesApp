$("#sign-in").click(function(){
  var twitterWindow=window.open("", "Auth", 'width=800,height=600');
  $.post("/sign_in_request",function(res){
    if(res.error){
      alert(res.error);
    }else if(res.id){
      sign_in(res.name);
    }else{
      twitterWindow.location.href="https://api.twitter.com/oauth/authenticate?oauth_token="+res;
      $.post("/get_user",{tok:res},function(response){
        if(!response.user){
          alert("Error logging in.");
        }else if(response.error_fetching_user){
          alert(response.user.error_fetching_user);
        }else if(response.user){
          sign_in(response.name);
        }
      });
    }
  });
});
   
function sign_in(name){
  window.location.reload(false);
}

$("#navbar-right").on("click","#sign-out",sign_out);

function sign_out(){
  $.post("/sign_out",function(res){
      window.location="/"; 
  });
}