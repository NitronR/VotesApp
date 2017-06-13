var chart=document.getElementById("piechart");
chart.height=50;
var bgColors=[
              '#F44336',
              '#E91E63',
              '#9C27B0',
              '#673AB7',
              '#3F51B5',
              '#2196F3',
              '#03A9F4',
              '#00BCD4',
              '#009688',
              '#4CAF50',
              '#8BC34A',
              '#CDDC39',
              '#FFEB3B',
              '#FFC107',
              '#FF9800',
              '#FF5722',
              '#795548',
              '#9E9E9E'
          ];
var l=Object.keys(choice).length-19;
while(l-->=0){
  bgColors.push("rgb("+Math.floor(Math.random()*256)+","+Math.floor(Math.random()*256)+","+Math.floor(Math.random()*255)+")");
}
var myChart = new Chart(chart, {
  type: 'doughnut',
  data: {
      labels: Object.keys(choice),
      datasets: [{
          label: '# of Votes',
          data: Object.keys(choice).map(function(e){return choice[e];}),
          backgroundColor: bgColors,
          borderWidth: 1
      }]
  },
  options:{
    responsive:true
  }
});

$("#share").click(function(){
  window.open("https://twitter.com/intent/tweet?url="+encodeURIComponent(window.location.href)+"&text="+encodeURIComponent(document.title), '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600');
});

$("#poll-choice").change(function(){
  if($("#poll-choice").val()=="add"){
    $(".ao").css("display","block");
    $(".an").css("display","none");
  }else{
    $(".ao").css("display","none");
    $(".an").css("display","block");
  }
});

$("#submit-option").click(function(){
  var add_option=$("#add-option").val().trim();
  if(add_option!=""){
    var option={option:add_option};
    $.post("/add_option",option,function(response){
      if(response.error){
        alert(response.error);
      }else{
        alert("Option added!");
        window.location.reload(false); 
      }
    });
  }else{
    alert("Enter option to add.")
  }
});

$("#choose").click(function(){
  var choice=$('#poll-choice').find(":selected");
  if(choice.val()!=""){
    choice=choice.text();
    $.post("/vote",{choice:choice},function(response){
      if(response.error){
        alert(response.error);
      }else{
        alert("You voted for : "+choice);
        window.location.reload(false); 
      }
    });
  }else{
    alert("Select an option to vote.")
  }
});

$("#delete-poll").click(function(){$("#delete-modal").modal();});

$("#delete-confirm").click(function(){
  $.post("/delete_poll",function(response){
    if(response.error){
      alert(response.error);
    }else{
      alert("Poll deleted.");
      window.location="/";
    }
  });
});