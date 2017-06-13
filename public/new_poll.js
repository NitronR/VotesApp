$("#bt_poll").click(function(){
  var title=$("#poll-title").val();
  var choice_str=$("#poll-choice").val();
  if(title!="" && choice_str.trim()!=""){
    var choice_str=choice_str.split("\n");
    var choice={};
    choice_str.forEach(function(e){
      if(e.trim()!=""){
        choice[e]=0;
      }
    });
    if(Object.keys(choice).length>=2){
      $.post("/create_new_poll",{title:title,choice:JSON.stringify(choice)},function(data){
        if(data.error){
          alert(data.error);
        }else if(data){
          alert("Poll created.");
          window.location="/polls/"+data.id;
        }
      });
    }else{
      alert("Provide at least 2 choices.");
    }
  }else{
    alert("All fields are required.");
  }
});