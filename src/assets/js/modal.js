export default class Modal {
  constructor (mediator) {
    this.mediator = mediator;
    this.modal;
  }
  // function that creates the modal and then renders it
  createModal () {
    this.mediator.room = this.mediator.h.getQString(location.href, "room") ? this.mediator.h.getQString(location.href, "room") : "";
    this.mediator.username = sessionStorage && sessionStorage.getItem("username") ? sessionStorage.getItem("username") : "";
    this.mediator.title = this.mediator.room.replace(/(_.*)/, '');
    if (this.mediator.title && document.getElementById('chat-title')) document.getElementById('chat-title').innerHTML = this.mediator.title;
    var ee = window.ee = this.ee();
    var chatEvents = {};
    //initSocket(); // letting socket start for now
    var modal = new tingle.modal({
      closeMethods: [],
      footer: true,
      stickyFooter: true,
      onOpen:function(){
        let setupBtn = document.getElementById('tingleSetupBtn');
        if(setupBtn){
          let deviceSelection = document.getElementById('deviceSelection');
          let preview = document.getElementById('preview');
          let local = document.getElementById('local');
          if(this.mediator.h.isOldEdge() || !this.mediator.autoload){
            setupBtn.addEventListener('click',function(e){
              e.preventDefault();
              setupBtn.hidden = true;
              if(deviceSelection.hidden) {
                deviceSelection.hidden=false;
                resetDevices();
                ee.emit('modal:filled',modal);
              }
            })
          } else {
            setupBtn.hidden = true;
            resetDevices();
            ee.emit('modal:filled',modal);
          }
          if(preview && local) {
            preview.appendChild(local);
            local.className = "";
          }
        }
        var cr = document.getElementById('create-room');
        if(cr)  cr.addEventListener('click', async (e) => {
              e.preventDefault();
              let roomName = document.querySelector('#room-name').value;
              let yourName = document.querySelector('#your-name').value;
              let romp = document.querySelector('#room-pass').value;
              if (roomName && yourName) {
                  //remove error message, if any
                  var errmsg = document.querySelector('#err-msg');
                  if(errmsg) document.querySelector('#err-msg').innerHTML = "";

                  //save the user's name in sessionStorage
                  sessionStorage.setItem('username', yourName);
                  //create room link
                  let roomgen = `${roomName.trim().replace(' ', '_')}_${this.mediator.h.generateRandomString()}`;
                  let roomLink = `${location.origin}?room=${roomgen}`;
                  room = roomgen;
                  username = yourName;
                  cr.hidden=true;
                  if(romp) {
                    roompass=romp;
                    await storePass(romp,yourName);
                  }
                  //show message with link to room
                  document.querySelector('#room-created').innerHTML = `Room successfully created. Share the <a id="clipMe" style="background:lightgrey;font-family:Helvetica,sans-serif;padding:3px;color:grey" href='${roomLink}' title="Click to copy">room link</a>  with your partners.`;
                  var clip = document.getElementById('clipMe');
                  if(clip) clip.addEventListener('click',function(e){
                    e.preventDefault();
                    this.mediator.h.copyToClipboard(e.target.href);
                    if(errmsg) {
                      errmsg.innerHTML='Link copied to clipboard '+roomLink;
                    }
                  });
                  //empty the values
                  document.querySelector('#room-name').value = roomgen;
                  document.querySelector('#room-name').readonly = true;
                  document.querySelector('#your-name').readonly = true;
                  document.querySelector('#room-pass').readonly = true;
                  document.querySelector('#room-name').disabled = true;
                  document.querySelector('#your-name').disabled = true;
                  document.querySelector('#room-pass').disabled = true;
              }

              else {

                  document.querySelector('#err-msg').innerHTML = "All fields are required";
                 // roomName.focus();
              }
          });
      }
    });
    var modal = this.mediator.modal;
    var toggleModal = document.getElementById('toggle-modal');
    if(toggleModal) toggleModal.addEventListener('click',e=>{
      e.preventDefault();
      modal.open();
    })
    async function storePass(pval,creator){
      return new Promise(async (res,rej)=>{
        let it = await SEA.work({room:room,secret:pval},pval,null,{name:'SHA-256'});
        console.log("hash",it);
        roompass = pval;
        ee.set('rooms.'+room+'.pwal',pval);
        ee.set('rooms.'+room+'.hash',it);
        if(creator) ee.set('rooms.'+room+'.creator',creator);
        return res(it);
      });
    }
    ee.on('join:ok',async function(){
      var args = Array.from(arguments); // no spread here, because of Edge crapping
      console.log('Arguments are ', args);
      let _name = document.querySelector('#username') ? document.querySelector('#username') : sessionStorage.getItem('username') ? {value: sessionStorage.getItem('username')} : false;
      let _pass = document.querySelector('#room-pass');

      if(!_name || !_name.value) return;
      if (_name && _name.value) {
        sessionStorage.setItem('username', _name.value);
      }
      if (room && history.pushState) {
        window.history.pushState(null,'','?room='+room);
      }
      var pval = _pass && _pass.value ? _pass.value : false;
      if(pval) await storePass(pval);
      var ve = document.getElementById('local');
      var vs = document.getElementById('localStream');
      if(ve && vs){
        ve.className="local-video clipped";
        vs.appendChild(ve);
      }
      initSocket().then(sock=>{
        initRTC();
        modal.close();
      })
    });
    ee.on('setup:ok',async function(){
      var args = Array.from(arguments); // no spread here, because of Edge crapping
      let _name = document.querySelector('#your-name');
      let _room = document.querySelector('#room-name');
      let _pass = document.querySelector('#room-pass');

      if(!_name || !_name.value || !_room  || !_room.value) {
        document.querySelector('#err-msg').innerHTML = "Room and username fields are required";
        return;
      }
      if (_name && _name.value) {
        sessionStorage.setItem('username', _name.value);
      }
      if (_room && _room.value && history.pushState) {
        window.history.pushState(null,'','?room='+_room.value);
        room = _room.value;
      }
      var pval = _pass && _pass.value ? _pass.value : false;
      if(pval) await storePass(pval,_name.value);
      console.log('Arguments are ', args);
      var ve = document.getElementById('local');
      var vs = document.getElementById('localStream');
      if(ve && vs){
        ve.className="local-video clipped";
        vs.appendChild(ve);
      }
      initSocket().then(sock=>{
        initRTC();
        modal.close();
      })
    });
    ee.on('nouser:ok',async function(){
      var args = Array.from(arguments); // no spread here, because of Edge crapping
      let _name = document.querySelector('#username');
      let _pass = document.querySelector('#room-pass');

      if (!_name || !_name.value) { return; }
      if (_name && _name.value) {
        sessionStorage.setItem('username', _name.value);
      }
      if (room && history.pushState) {
        window.history.pushState(null,'','?room='+room);
      }
      var pval = _pass && _pass.value ? _pass.value : false;
      if(pval) await storePass(pval);
      console.log('Arguments are ', args);
      var ve = document.getElementById('local');
      var vs = document.getElementById('localStream');
      if(ve && vs){
        ve.className="local-video clipped";
        vs.appendChild(ve);
      }
      initSocket().then(sock=>{
        initRTC();
        modal.close();
      })
    });
    ee.on('noroom:ok',async function(){
      var args = Array.from(arguments); // no spread here, because of Edge crapping
      console.log('Arguments are ', args);
      let _name = document.querySelector('#room-name');
      let _pass = document.querySelector('#room-pass');

      if (_name && _name.value) {
        room = _name.value
      }
      if (room && history.pushState) {
        window.history.pushState(null,'','?room='+room);
      }
      var pval = _pass && _pass.value ? _pass.value : false;
      if(pval) await storePass(pval);
      var ve = document.getElementById('local');
      var vs = document.getElementById('localStream');
      if(ve && vs){
        ve.className="local-video clipped";
        vs.appendChild(ve);
      }
      initSocket().then(sock=>{
        initRTC();
        modal.close();
      })
    });
    ee.on('modal:filled',function(modal){
      let type = modal.__type;
      setTimeout(function(){ modal.checkOverflow() },300);
      var letsgo = document.querySelectorAll('.letsgo');
      if(!letsgo.length){

        modal.addFooterBtn("Let's Go !  <i class='fas fa-chevron-right'></i>", 'tingle-btn tingle-btn--primary letsgo tingle-btn--pull-right', function(e){
          try { mutedStream = this.mediator.h.getMutedStream(); } catch(err){ console.warn("error in getting mutedstream",err); }
          ee.emit(type+':ok',{modal,e});
        });
      }
    })
    var cancelFn = function(why){
      room=null;
      sessionStorage.clear();
      modal.close();
      window.location = '/';
    }
    ee.on('join:cancel',cancelFn);
    ee.on('nouser:cancel',cancelFn);
    ee.on('noroom:cancel',cancelFn);
    ee.on('setup:cancel',cancelFn);
    ee.on("Chat-Message", function (data) {
      metaData.sendChatData(data);
    });

    function resetDevices() {
      var as = document.getElementById('as');
      var ao = document.getElementById('ao');
      var vs = document.getElementById('vs');
      var ve = document.getElementById('local');
      if(ve) localVideo=ve;
      if (myStream) {
        myStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      if(!this.mediator.h.canSelectAudioDevices()) { //Firefox springs to mind ;(
        ao.disabled = true;
        ao.readonly = true;
      }
      var aoListener = function(e){
        return this.mediator.h.setAudioToVideo(ao,ve);
      }
      ao.removeEventListener('change',aoListener);
      ao.addEventListener('change',aoListener)
      as.removeEventListener('change',resetDevices);
      as.addEventListener('change',resetDevices);
      vs.removeEventListener('change',resetDevices);
      vs.addEventListener('change',resetDevices);
      var clicked = function clicked(e){ ee.set('config['+e.target.id+']',!!this.checked); };
      sam.removeEventListener('click',clicked);
      svm.removeEventListener('click',clicked);
      sam.addEventListener('click',clicked);
      svm.addEventListener('click',clicked);
      const asv = as.value;
      const vsv = vs.value;
      const samv = sam.checked;
      const svmv = svm.checked;
      const constraints = {
        audio: {deviceId: asv ? {exact: asv} : undefined},
        video: {deviceId: vsv ? {exact: vsv} : undefined}
      };
      this.mediator.h.getUserMedia(constraints).then(async stream=>{
        myStream = stream;
        window.myStream = stream;
        this.mediator.h.setVideoSrc(ve,stream);
        this.mediator.h.replaceStreamForPeers(pcmap,stream);
        ve.oncanplay = function(){ modal.checkOverflow(); }
        return Object.keys(devices).length>0 ? devices : this.mediator.h.getDevices();
      }).then(devices=>{
        this.navigatorGotDevices(devices);
      }).catch(err=>{
        console.warn('something fishy in devices',err);
      });

    }
    var modalContent="";
    var errmsg = '<span class="form-text small text-danger" id="err-msg"></span>';
    var cammicsetc =
      this.mediator.h.isOldEdge() || !this.mediator.autoload
        ? `
        <div class="col-md-12">
        <button class="form-control rounded-0" id="tingleSetupBtn">Set up your devices</button>
      <div id="deviceSelection" hidden>
      <label for="as">Mic:</label><br/>
      <select id="as"></select><br/>
      <label for="ao">Speakers: </label><br/>
      <select id="ao"></select><br/>
      <label for="vs">Camera:</label><br/>
      <select id="vs"></select><br/>
      <button class="btn btn-lg btn-outline-light" id="sam" title="Mute/Unmute Audio">
        <i class="fa fa-volume-up"></i>
      </button>
      <button class="btn btn-lg btn btn-outline-light fas fa-video" id="svm" title="Mute/Unmute Video">
      </button><br/>
      <div id="preview"><video id="local" playsinline autoplay muted width="150px"></video></div>
    </div>
    </div>
  `
        : `
  <div class="p-container">
  <div id="" class="preview-container">
    <div class="row">

      <div class="col-md-12 mx-auto">
  <video id="local" class="mx-auto" playsinline autoplay muted></video>
   </div>

      <div class="preview-video-buttons row col-md-12">

      <div class="col m-1 mb-3 mx-auto">
        <button id="sam" class="fa fa-volume-up mx-auto" title="Mute/Unmute Audio">
        </button>
        <small class="d-block d-xs-block d-md-none text-white m-3 mx-auto text-center">Sound On / Off</small>
        </div>
        <div class="col m-1 mb-3 mx-auto">
        <button id="svm" class="fa fa-video mx-auto" title="Mute/Unmute Video">

        </button>
        <small class="d-block d-xs-block d-md-none text-white m-3 mx-auto text-center">Cam On / Off</small>
        </div>
    </div>
    </div>

  </div>

  <button class="form-control rounded-0" id="tingleSetupBtn">Set up your devices</button>

      <div id="deviceSelection">

        <div class="form-row">

          <div class="col-md-4 mb-3">
           <label for="as" class="text-white">Mic:</label>
             <select id="as" class="form-control btn-sm rounded-0"></select>
           </div>

         <div class="col-md-4 mb-3">
              <label for="ao" class="text-white">Speakers: </label>
                <select id="ao" class="form-control btn-sm rounded-0"></select>
             </div>

        <div class="col-md-4 mb-3">
                <label for="vs" class="text-white">Camera:</label>
              <select id="vs" class="form-control btn-sm rounded-0"></select>
            </div>
        </div>
      </div>
      </div>

    `;

    ee.on('navigator:gotDevices',function(devices){
      //console.log('hello',devices);
      ["as","ao","vs"].map(function(group){
        let devs = devices[group];
        var str = "";
        var qs = document.getElementById(group);
        this.mediator.h.each(devs,function(label,device){
          //console.log(label,device);
          var opt = document.getElementById(label.replace(/[^a-zA-Z0-9]/g,''));
          if(!opt) {
            opt = document.createElement('option');
            opt.id= label.replace(/[^a-zA-Z0-9]/g,'');
          }
          opt.value = device.deviceId;
          opt.text = label;
          if(qs) qs.appendChild(opt);
        });
        modal.checkOverflow();
      });
    });
    this.mediator.h.getDevices().then(devices=>{
      this.mediator.devices = devices;
      devices = window.devices = devices;
      this.navigatorGotDevices(devices);
    });
    // default inputs
    var joinnameinput = `<label for="username">Your Name</label><input type="text" id="username" class="form-control rounded-0" placeholder="Your Name" required/>`;
    var createnameinput = `<label for="your-name">Your Name</label> <input type="text" id="your-name" class="form-control rounded-0" placeholder="Your Name" required/>`;
    var passwinput = `<label for="room-pass">Room password</label> <input id="room-pass" class="form-control rounded-0" type="password" autocomplete="new-password" placeholder="Password (optional)" />`;
    var roominput = `<label for="room-name">Room Name</label><input type="text" id="room-name" class="form-control rounded-0" placeholder="Room Name" required/> `;
    // @TODO disable roomcreate button when errors
    var roomcreatebtn = `<button id="create-room" class="btn btn-block rounded-0 btn-info">Create Room</button>`
    var roomcreated = `<div id="room-created"></div>`;

    if(this.mediator.room && this.mediator.username){
      // Welcome back xX!
      modalContent = `
      <div class="container-fluid">
      <div class="row">
      <div class="col-md-4 speech-bubble mx-auto">
       ${cammicsetc}
      </div>
      <div class="col-md-4 mt-4 mx-auto text-white">
      <h4 class="speech-msg">Welcome back, <input type="hidden" id="username" value="${this.mediator.username}"/>${username}! </h4>
      <p>You're joining room: <input type="hidden" id="room-name" value="${this.mediator.room}"/> ${this.mediator.title} </p>
      <br/>${passwinput}<br/>
      </div>
      </div>
      </div>`;
      return this.loadModal(modal,modalContent,'join');
      //
    } else if(this.mediator.room && !this.mediator.username){
      // set username and camera options
      // when is room created
      modalContent =
      `
      <div class="row">
      <div class="col-md-4 speech-bubble mx-auto">
        ${cammicsetc}
         </div>
        <div class="col-md-4 mt-4 mx-auto room-form">
        <h4 class="speech-msg">
        Welcome, you're joining room <input type="hidden" id="room-name" value="${room}"/> ${title}</h4>

        <p>
        Please enter your username and set up your camera options! </p>
        <br/>
        ${joinnameinput} <br/>
        ${passwinput} <br/>

        </div>

      </div>
      `;
      return this.loadModal(modal,modalContent,'nouser');

    } else if (!this.mediator.room && this.mediator.username) {

      // enter room name to join
      modalContent = `
    <div class="container-fluid">
      <div class='row'>
      <div class='col-md-4 speech-bubble mx-auto'>
        ${cammicsetc}
         </div>
        <div class='col-md-4 mt-4 mx-auto room-form'>
        <h4 class='speech-msg'>

        Welcome back, <input type='hidden' id='username' value='${this.mediator.username}'/>${this.mediator.username}</h4>
        <p>
        Please enter the room name you want to join or create below! </p>
        <br/>
      ${roominput}<br/>
      ${passwinput}<br/>
        </div>
      </div>
      </div>`;


      return this.loadModal(modal,modalContent,'noroom');
    }else {
      // Set up a new room
      modalContent = `
      <div class="container-fluid">
      <div class='row'>
        <div class='col-md-4 speech-bubble mx-auto'>
          <p class='speech-msg'>
          Hey, let\'s set up a new room!</p>
          ${cammicsetc}
        </div>
        <div class='col-md-4 mx-auto mt-5 room-form'>
          <div class='d-none d-xs-none d-md-block'>
            <img src='https://camo.githubusercontent.com/057efe39855e1a06d6c7f264c4545fc435954717/68747470733a2f2f692e696d6775722e636f6d2f585337396654432e706e67' width='200' style='filter:invert(1); opacity:.5' />
         </div>
         <p>${roomcreated}</p>
          ${errmsg}<br>
          ${createnameinput}<br>
          ${roominput}<br>
          ${passwinput}<br>
          <br> <br>
          ${roomcreatebtn}
         </div>
        </div>
        </div>
        `

      return this.loadModal(modal,modalContent,'setup');
    }

  }

  // function to call after modal has been created
  filledModal (modal) {
    let type = modal.__type;
    setTimeout(function(){ modal.checkOverflow() },300);
    var letsgo = document.querySelectorAll('.letsgo');
    if(!letsgo.length){

      modal.addFooterBtn("Let's Go !  <i class='fas fa-chevron-right'></i>", 'tingle-btn tingle-btn--primary letsgo tingle-btn--pull-right', function(e){
        try { mutedStream = this.mediator.h.getMutedStream(); } catch(err){ console.warn("error in getting mutedstream",err); }
        ee.emit(type+':ok',{modal,e});
      });
    }
  }

  ee () {
    return {
      on:function (events, data) {
        console.log('oncalled',events, data);
      },
      emit:function (events, data) {
        console.log('emitted', events, data);
      }
   };
  }

  loadModal (modal,createOrJoin,type){
    debugger
    Object.assign(modal,{__type:type});
    modal.setContent(`${createOrJoin}`);
    modal.addFooterBtn(`<i class='fas fa-times'></i> Reset`, 'tingle-btn tingle-btn--default tingle-btn--pull-left', function(e){
      try { mutedStream = mutedStream ? mutedStream : this.mediator.h.getMutedStream(); } catch(err){ console.warn("error in getting mutedstream",err); }
      ee.emit(type+':cancel',{modal,e});
    });
    modal.open();
  }

  async joinOk () {
      var args = Array.from(arguments); // no spread here, because of Edge crapping
      console.log('Arguments are ', args);
      let _name = document.querySelector('#username') ? document.querySelector('#username') : sessionStorage.getItem('username') ? {value: sessionStorage.getItem('username')} : false;
      let _pass = document.querySelector('#room-pass');

      if(!_name || !_name.value) return;
      if (_name && _name.value) {
        sessionStorage.setItem('username', _name.value);
      }
      if (room && history.pushState) {
        window.history.pushState(null,'','?room='+room);
      }
      var pval = _pass && _pass.value ? _pass.value : false;
      if(pval) await storePass(pval);
      var ve = document.getElementById('local');
      var vs = document.getElementById('localStream');
      if(ve && vs){
        ve.className="local-video clipped";
        vs.appendChild(ve);
      }
      initSocket().then(sock=>{
        initRTC();
        this.mediator.modal.close();
      })
  }

  setupOk (){

  }

  navigatorGotDevices (devices) {
      if(this.mediator.DEBUG){console.log('hello',devices);}
      ["as","ao","vs"].map(function(group){
        let devs = devices[group];
        var str = "";
        var qs = document.getElementById(group);
        h.each(devs,function(label,device){
          if(this.mediator.DEBUG){console.log(label,device);}
          var opt = document.getElementById(label.replace(/[^a-zA-Z0-9]/g,''));
          if(!opt) {
            opt = document.createElement('option');
            opt.id= label.replace(/[^a-zA-Z0-9]/g,'');
          }
          opt.value = device.deviceId;
          opt.text = label;
          if(qs) qs.appendChild(opt);
        });
        modal.checkOverflow();
      });
  }

}
