/* Visual Physics — интерактивные мини-симуляции для каждой модели.
   Каждая модель = свой <canvas class="viz-canvas" data-sim="...">.
   Управление: движение мыши / перетаскивание / клик (см. подпись на карточке). */
(function () {
  'use strict';
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var C = { indigo:'#6366f1', violet:'#7c3aed', cyan:'#06b6d4', ink:'#0e1020', mut:'#8b90a6',
            line:'#d7d9ee', good:'#22c55e', bad:'#ef4444', gold:'#f59e0b', blue:'#2563eb' };

  function clamp(v,a,b){ return v<a?a:v>b?b:v; }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function dot(ctx,x,y,r,fill){ ctx.beginPath(); ctx.arc(x,y,r,0,6.2832); ctx.fillStyle=fill; ctx.fill(); }
  function label(ctx,t,x,y,col,size){ ctx.fillStyle=col||C.mut; ctx.font='600 '+(size||12)+'px Manrope, system-ui, sans-serif'; ctx.textAlign='center'; ctx.fillText(t,x,y); }
  function arrow(ctx,x1,y1,x2,y2,col,wd){ ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=wd||3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    var a=Math.atan2(y2-y1,x2-x1), h=8+(wd||3); ctx.beginPath();
    ctx.moveTo(x2,y2); ctx.lineTo(x2-h*Math.cos(a-0.4),y2-h*Math.sin(a-0.4)); ctx.lineTo(x2-h*Math.cos(a+0.4),y2-h*Math.sin(a+0.4)); ctx.closePath(); ctx.fill(); }

  var SIMS = {
    /* 1 — Давление: число гвоздей задаётся мышью по X */
    pressure: { draw:function(ctx,s){ var w=s.w,h=s.h; var n=Math.max(1,Math.round(s.px*40));
      var safe=n>=8; var base=h-26;
      for(var i=0;i<n;i++){ var x=lerp(28,w-28,n===1?0.5:i/(n-1)); ctx.strokeStyle=C.line; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x,base); ctx.lineTo(x,base-18); ctx.stroke(); dot(ctx,x,base-18,2,C.mut); }
      var sink=safe?0:10; ctx.fillStyle=safe?'rgba(34,197,94,.18)':'rgba(239,68,68,.18)';
      ctx.strokeStyle=safe?C.good:C.bad; ctx.lineWidth=2.5; var bw=Math.min(w-56,150);
      ctx.beginPath(); ctx.roundRect((w-bw)/2, base-44+sink, bw, 26, 7); ctx.fill(); ctx.stroke();
      label(ctx,'⬇ вес', w/2, base-27+sink, safe?C.good:C.bad, 12);
      label(ctx, n+' '+(safe?'гвоздей — безопасно':'гвоздя — больно!'), w/2, 22, safe?C.good:C.bad, 13);
      label(ctx,'p = F / S', w/2, h-7, C.mut, 11);
    } },

    /* 2 — Центробежная: скорость от X, грузы отъезжают (∝ скорость²) */
    centrifuga: { init:function(s){ s.extra.a=0; }, draw:function(ctx,s){ var w=s.w,h=s.h,cx=w/2,cy=h/2-4;
      var sp=clamp(s.px,0.05,1); s.extra.a+=sp*0.16; var R=Math.min(w,h)/2-14;
      ctx.strokeStyle=C.line; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,R,0,6.2832); ctx.stroke();
      var out=lerp(14, R-12, sp*sp);
      for(var i=0;i<4;i++){ var a=s.extra.a+i*Math.PI/2; var ex=cx+Math.cos(a)*out, ey=cy+Math.sin(a)*out;
        ctx.strokeStyle=C.indigo; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(ex,ey); ctx.stroke();
        dot(ctx,ex,ey,7,C.violet); }
      dot(ctx,cx,cy,6,C.ink);
      label(ctx,'скорость: '+Math.round(sp*100)+'%', w/2, 18, C.mut,12);
      label(ctx,'F = mv² / r', w/2, h-7, C.mut,11);
    } },

    /* 3 — Полиспаст: число нитей от X, сила F=P/n */
    polispast: { draw:function(ctx,s){ var w=s.w,h=s.h; var n=clamp(Math.round(s.px*4)+1,1,5);
      var topY=20, wx=w/2;
      ctx.strokeStyle=C.line; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(24,topY); ctx.lineTo(w-24,topY); ctx.stroke();
      var wy=h-40;
      for(var i=0;i<n;i++){ var x=wx-( (n-1)*9 )/2 + i*9; ctx.strokeStyle=C.cyan; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,topY); ctx.lineTo(x,wy); ctx.stroke(); }
      ctx.fillStyle='rgba(99,102,241,.18)'; ctx.strokeStyle=C.indigo; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.roundRect(wx-30,wy,60,26,7); ctx.fill(); ctx.stroke(); label(ctx,'P',wx,wy+18,C.indigo,13);
      arrow(ctx, w-40, topY+14, w-40, topY+14+lerp(46,12,(n-1)/4), C.violet, 3); label(ctx,'F',w-40,topY+6,C.violet,12);
      label(ctx, 'нитей: '+n+'  →  сила в '+n+'× меньше', w/2, h-8, C.mut, 12);
    } },

    /* 4 — Гироскоп: клик = раскрутить; раскрученное держит ось */
    gyro: { init:function(s){ s.extra.spin=false; s.extra.tilt=0; s.extra.a=0; },
      onDown:function(s){ s.extra.spin=!s.extra.spin; },
      draw:function(ctx,s){ var w=s.w,h=s.h,cx=w/2,cy=h/2; var sp=s.extra.spin;
      s.extra.tilt = sp ? Math.sin(s.t*0.04)*0.12 : clamp(s.extra.tilt+0.01,0,0.9);
      if(sp) s.extra.a+=0.3;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(s.extra.tilt);
      ctx.strokeStyle=C.line; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,40); ctx.lineTo(0,-2); ctx.stroke();
      var R=Math.min(w,h)/2-18;
      ctx.strokeStyle=sp?C.indigo:C.mut; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(0,0,R,0,6.2832); ctx.stroke();
      for(var i=0;i<6;i++){ var a=s.extra.a+i*Math.PI/3; ctx.strokeStyle='rgba(124,58,237,.5)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R); ctx.stroke(); }
      ctx.restore();
      label(ctx, sp?'крутится — держит ось':'нажмите, чтобы раскрутить', w/2, h-8, sp?C.indigo:C.mut, 12);
    } },

    /* 5 — Маятники: длина от X, разная масса — один период */
    mayatniki: { draw:function(ctx,s){ var w=s.w,h=s.h; var L=lerp(0.45,1,clamp(s.px,0,1));
      var len=(h-46)*L; var om=2.2/Math.sqrt(L); var ang=0.5*Math.cos(s.t*0.04*om);
      var sizes=[5,8,11], cols=[C.cyan,C.indigo,C.violet];
      for(var i=0;i<3;i++){ var ax=lerp(w*0.28,w*0.72,i/2), ay=18;
        var bx=ax+Math.sin(ang)*len, by=ay+Math.cos(ang)*len;
        ctx.strokeStyle=C.line; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
        dot(ctx,ax,ay,2.5,C.mut); dot(ctx,bx,by,sizes[i],cols[i]); }
      label(ctx,'разная масса — качаются в такт', w/2, 14, C.mut,12);
      label(ctx,'T = 2π√(l/g)  ·  ↔ длина', w/2, h-7, C.mut,11);
    } },

    /* 6 — Равнодействующая: тяни две стрелки, сумма обновляется */
    ravnodeystvie: { init:function(s){ s.extra.v1={x:-70,y:-34}; s.extra.v2={x:60,y:-50}; s.extra.drag=null; },
      onDown:function(s){ var cx=s.w/2,cy=s.h/2; var p={x:s.px*s.w-cx,y:s.py*s.h-cy};
        var d1=Math.hypot(p.x-s.extra.v1.x,p.y-s.extra.v1.y), d2=Math.hypot(p.x-s.extra.v2.x,p.y-s.extra.v2.y);
        s.extra.drag = d1<d2 ? 'v1':'v2'; },
      draw:function(ctx,s){ var w=s.w,h=s.h,cx=w/2,cy=h/2+6;
        if(s.down && s.extra.drag){ s.extra[s.extra.drag]={x:clamp(s.px*w-cx,-cx+14,cx-14),y:clamp(s.py*h-cy,-cy+14,cy-14)}; }
        var v1=s.extra.v1,v2=s.extra.v2;
        arrow(ctx,cx,cy,cx+v1.x,cy+v1.y,C.indigo,3); arrow(ctx,cx,cy,cx+v2.x,cy+v2.y,C.cyan,3);
        ctx.setLineDash([4,4]); ctx.strokeStyle='rgba(124,58,237,.4)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx+v1.x,cy+v1.y); ctx.lineTo(cx+v1.x+v2.x,cy+v1.y+v2.y); ctx.moveTo(cx+v2.x,cy+v2.y); ctx.lineTo(cx+v1.x+v2.x,cy+v1.y+v2.y); ctx.stroke(); ctx.setLineDash([]);
        arrow(ctx,cx,cy,cx+v1.x+v2.x,cy+v1.y+v2.y,C.violet,4);
        dot(ctx,cx,cy,4,C.ink);
        label(ctx,'↔ тяни стрелки · фиолетовая = сумма', w/2, h-7, C.mut,11);
    } },

    /* 7 — Лабиринт: клик сверху роняет шарик, он скачет вниз */
    labirint: { init:function(s){ s.extra.balls=[]; s.extra.bins=new Array(9).fill(0); },
      onDown:function(s){ s.extra.balls.push({x:clamp(s.px*s.w,20,s.w-20),y:6,vx:0,vy:0,done:false}); },
      draw:function(ctx,s){ var w=s.w,h=s.h; var rows=5, gy=24, top=30, gap=(h-70)/rows;
        for(var r=0;r<rows;r++){ var cols=r+3; for(var c=0;c<cols;c++){ var x=w/2+(c-(cols-1)/2)*gy, y=top+r*gap; dot(ctx,x,y,2.5,C.line); } }
        var binW=w/9;
        s.extra.balls.forEach(function(b){ if(!b.done){ b.vy+=0.12; b.y+=b.vy; b.x+=b.vx; b.vx*=0.98;
          var r2=Math.round((b.y-top)/gap); if(r2>=0&&r2<rows && Math.abs((b.y-(top+r2*gap)))<3){ b.vx += (Math.random()<0.5?-1:1)*1.1; }
          if(b.x<10||b.x>w-10){ b.vx*=-0.6; b.x=clamp(b.x,10,w-10); }
          if(b.y>h-18){ b.done=true; var bin=clamp(Math.floor(b.x/binW),0,8); s.extra.bins[bin]++; }
          dot(ctx,b.x,b.y,4,C.violet); } });
        for(var i=0;i<9;i++){ var hgt=Math.min(s.extra.bins[i]*4,h-24); ctx.fillStyle='rgba(99,102,241,.5)'; ctx.fillRect(i*binW+2,h-12-hgt,binW-4,hgt); }
        label(ctx,'нажмите сверху — уроните шарик', w/2, 14, C.mut,12);
    } },

    /* 8 — Архимед: тяни груз в воду, вес «уменьшается» */
    arhimed: { init:function(s){ s.extra.sub=0; }, draw:function(ctx,s){ var w=s.w,h=s.h;
      var waterTop=h*0.42; ctx.fillStyle='rgba(6,182,212,.16)'; ctx.fillRect(20,waterTop,w-40,h-waterTop-14);
      ctx.strokeStyle='rgba(6,182,212,.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(20,waterTop); ctx.lineTo(w-40,waterTop); ctx.stroke();
      var target = s.down ? clamp(s.py*h, waterTop-20, h-40) : null;
      s.extra.sub = lerp(s.extra.sub, target!=null?clamp((target-(waterTop-20))/60,0,1):0, 0.2);
      var sub=s.extra.sub; var ox=w/2, oy=lerp(waterTop-20, waterTop+38, sub);
      ctx.strokeStyle=C.line; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(ox,8); ctx.lineTo(ox,oy-16); ctx.stroke();
      ctx.fillStyle='rgba(124,58,237,.2)'; ctx.strokeStyle=C.violet; ctx.lineWidth=2.5; ctx.beginPath(); ctx.roundRect(ox-18,oy-16,36,32,6); ctx.fill(); ctx.stroke();
      if(sub>0.05) arrow(ctx,ox,oy+22,ox,oy+22-lerp(0,28,sub),C.cyan,3);
      var apparent=Math.round(100-sub*55);
      label(ctx,'кажущийся вес: '+apparent+'%', w/2, 16, sub>0.5?C.cyan:C.mut,12);
      label(ctx, (s.down?'':'↕ ')+'опусти груз в воду  ·  Fₐ = ρgV', w/2, h-7, C.mut,11);
    } },

    /* 9 — Ферромагнетизм: двигай магнит, гайки тянутся и строят мост */
    ferromagnetizm: { init:function(s){ s.extra.p=[]; for(var i=0;i<26;i++) s.extra.p.push({x:Math.random(),y:Math.random(),ix:Math.random(),iy:Math.random()}); },
      draw:function(ctx,s){ var w=s.w,h=s.h; var mx=s.px*w, my=s.py*h;
      // магнит
      ctx.fillStyle=C.bad; ctx.fillRect(mx-16,my-9,16,18); ctx.fillStyle=C.blue; ctx.fillRect(mx,my-9,16,18);
      label(ctx,'N',mx-8,my+4,'#fff',11); label(ctx,'S',mx+8,my+4,'#fff',11);
      var pts=s.extra.p.map(function(q){ var bx=q.ix*w, by=q.iy*h; var dx=mx-bx, dy=my-by, d=Math.hypot(dx,dy)||1;
        var pull=clamp(60/d,0,0.85); q.cx=lerp(bx, mx, pull*0.6); q.cy=lerp(by, my, pull*0.6); return q; });
      // связи между близкими гайками (мост)
      for(var i=0;i<pts.length;i++)for(var j=i+1;j<pts.length;j++){ var d=Math.hypot(pts[i].cx-pts[j].cx,pts[i].cy-pts[j].cy); if(d<26){ ctx.strokeStyle='rgba(124,58,237,.35)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(pts[i].cx,pts[i].cy); ctx.lineTo(pts[j].cx,pts[j].cy); ctx.stroke(); } }
      pts.forEach(function(q){ dot(ctx,q.cx,q.cy,3.5,C.mut); });
      label(ctx,'↔ двигай магнит — гайки строят мост', w/2, h-7, C.mut,11);
    } },

    /* 10 — Кулон: курсор заряжен, лёгкие шарики реагируют; клик меняет знак */
    kulon: { init:function(s){ s.extra.q=[]; for(var i=0;i<22;i++) s.extra.q.push({x:Math.random(),y:Math.random(),vx:0,vy:0}); s.extra.sign=1; },
      onDown:function(s){ s.extra.sign*=-1; },
      draw:function(ctx,s){ var w=s.w,h=s.h; var mx=s.px*w,my=s.py*h; var sign=s.extra.sign;
      s.extra.q.forEach(function(b){ var bx=b.x*w, by=b.y*h; var dx=bx-mx, dy=by-my, d=Math.hypot(dx,dy)||1;
        var f=sign*clamp(360/(d*d),0,0.6); b.vx+=(dx/d)*f; b.vy+=(dy/d)*f; b.vx*=0.92; b.vy*=0.92;
        b.x+=b.vx/w; b.y+=b.vy/h; if(b.x<0.02||b.x>0.98){b.vx*=-0.5;b.x=clamp(b.x,0.02,0.98);} if(b.y<0.02||b.y>0.94){b.vy*=-0.5;b.y=clamp(b.y,0.02,0.94);}
        dot(ctx,b.x*w,b.y*h,4,C.cyan); });
      dot(ctx,mx,my,9, sign>0?'rgba(239,68,68,.85)':'rgba(37,99,235,.85)'); label(ctx,sign>0?'+':'−',mx,my+4,'#fff',13);
      label(ctx,'двигай заряд · клик = сменить знак ('+(sign>0?'отталкивает':'притягивает')+')', w/2, h-7, C.mut,11);
    } },
  };

  function setup(canvas) {
    var sim = SIMS[canvas.getAttribute('data-sim')]; if (!sim) return;
    var ctx = canvas.getContext('2d'); if (!ctx) return;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var s = { w: 0, h: 0, px: 0.5, py: 0.35, down: false, t: 0, extra: {} };
    function resize() { var w = canvas.clientWidth, hh = canvas.clientHeight; canvas.width = Math.round(w*DPR); canvas.height = Math.round(hh*DPR); ctx.setTransform(DPR,0,0,DPR,0,0); s.w = w; s.h = hh; }
    function pt(e){ var r = canvas.getBoundingClientRect(); s.px = clamp((e.clientX-r.left)/r.width,0,1); s.py = clamp((e.clientY-r.top)/r.height,0,1); if(!running) one(); }
    canvas.addEventListener('pointermove', pt);
    canvas.addEventListener('pointerdown', function(e){ s.down = true; pt(e); if (sim.onDown) sim.onDown(s); if(!running) one(); });
    window.addEventListener('pointerup', function(){ s.down = false; });
    canvas.addEventListener('pointerleave', function(){ s.down = false; });
    if (sim.init) sim.init(s);
    resize(); window.addEventListener('resize', resize);
    function one(){ try { ctx.clearRect(0, 0, s.w, s.h); sim.draw(ctx, s); } catch(e){} }
    var running = false, raf = null;
    function frame(){ s.t++; one(); raf = requestAnimationFrame(frame); }
    function start(){ if (running || REDUCE) return; running = true; raf = requestAnimationFrame(frame); }
    function stop(){ running = false; if (raf) cancelAnimationFrame(raf); }
    one();
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ es.forEach(function(e){ e.isIntersecting ? start() : stop(); }); }, { threshold: 0.2 }).observe(canvas);
    else start();
  }

  function init(){ Array.prototype.forEach.call(document.querySelectorAll('canvas.viz-canvas'), setup); }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
