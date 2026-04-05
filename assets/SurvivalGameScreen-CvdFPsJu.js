import{F as e,M as t,n,r}from"./AuthContext-CTOfCPGq.js";import{n as i}from"./index-hMinZ4ze.js";import{o as a}from"./rooms-B7fdzKtV.js";import{t as o}from"./Toast-rrdIjtFB.js";import{n as s,t as c}from"./useNavigation-CAbPGUkA.js";import"./UserAvatar-p7poLy6e.js";import{a as l,i as u,r as d,t as f}from"./survivalRooms-DtnlJjGn.js";var p=e(t(),1),m=r();function h(){let e=s(),t=c(),{userProfile:r}=n(),[h,g]=(0,p.useState)(null),[_,v]=(0,p.useState)(null),[y,b]=(0,p.useState)(``),[x,S]=(0,p.useState)(0),C=(0,p.useRef)(null);if((0,p.useEffect)(()=>a(e,e=>{if(!e){t.toHome();return}g(e),e.survivalState?.status===`finished`&&t.toSurvivalGameOver()}),[e]),(0,p.useEffect)(()=>{if(h?.survivalState?.status===`question`&&h?.survivalState?.roundStartTime){let e=h.survivalState.roundStartTime.toMillis?h.survivalState.roundStartTime.toMillis():Date.now(),t=(h.survivalState.timeLimit||15)*1e3,n=()=>{let n=Date.now()-e,r=Math.max(0,Math.ceil((t-n)/1e3));S(r),r<=0&&clearInterval(C.current)};n(),clearInterval(C.current),C.current=setInterval(n,1e3),v(null)}else clearInterval(C.current);return()=>clearInterval(C.current)},[h?.survivalState?.currentQuestionIndex,h?.survivalState?.status,h?.survivalState?.roundStartTime]),(0,p.useEffect)(()=>{T&&O===`question`&&(k>=A&&A>0||x===0&&h?.survivalState?.roundStartTime)&&N()},[T,O,k,A,x]),!h||!h.survivalState)return(0,m.jsx)(`div`,{style:{width:`100%`,height:`100%`,display:`flex`,alignItems:`center`,justifyContent:`center`},children:(0,m.jsx)(i,{})});let{survivalState:w}=h,T=h.hostUid===r.uid,E=w.alivePlayers[r.uid],D=w.questions[w.currentQuestionIndex],O=w.status,k=Object.keys(w.answers||{}).length,A=Object.values(w.alivePlayers).filter(e=>e).length,j=[`أ`,`ب`,`ج`,`د`],M=async t=>{if(!(O!==`question`||!E||_!==null)){v(t);try{await d(e,r.uid,t)}catch(e){b(e.message),v(null)}}},N=async()=>{if(!T||O!==`question`)return;let t=D.correct,n={...w.alivePlayers},r=[];Object.keys(w.alivePlayers).forEach(e=>{if(!w.alivePlayers[e])return;let i=w.answers[e]?.answer;(i===void 0||i!==t)&&(n[e]=!1,r.push(e))});try{await l(e,n,r)}catch(e){b(e.message)}};return(0,m.jsxs)(`div`,{style:{width:`100%`,height:`100%`,display:`flex`,flexDirection:`column`,padding:`20px`,overflowY:`auto`,overflowX:`hidden`},children:[(0,m.jsx)(`style`,{children:`
        .survival-header {
           background: var(--bg-dark-purple);
           color: #FFF;
           border: 4px solid var(--bg-dark-purple);
           box-shadow: 4px 4px 0 #FFF;
           padding: 6px 16px;
           font-weight: 900;
           font-size: 14px;
        }
        .survival-timer {
           font-size: 38px;
           font-weight: 950;
           color: var(--bg-dark-purple);
           text-shadow: 3px 3px 0 #FFF, -3px -3px 0 #FFF, 3px -3px 0 #FFF, -3px 3px 0 #FFF;
        }
        .q-card {
           background: #FFF;
           border: 6px solid var(--bg-dark-purple);
           box-shadow: 10px 10px 0 var(--bg-pink);
           padding: 32px 20px;
           margin-bottom: 30px;
           text-align: center;
        }
        .ans-btn {
           background: #FFF;
           border: 4px solid var(--bg-dark-purple);
           padding: 18px 12px;
           font-weight: 900;
           font-size: 17px;
           text-align: right;
           display: flex;
           align-items: center;
           gap: 12px;
           transition: all 0.1s;
        }
        .ans-btn.selected {
           background: var(--bg-pink);
           color: #FFF;
           transform: translate(4px, 4px);
           box-shadow: none !important;
        }
        .ans-btn.correct {
           background: var(--bg-green);
           color: #FFF;
        }
        .ans-btn.wrong {
           background: #FF4D4D;
           color: #FFF;
        }
      `}),(0,m.jsxs)(`h1`,{className:`sr-only`,children:[`لعبة البقاء للأقوى - `,D.q]}),(0,m.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:24},children:[(0,m.jsxs)(`div`,{className:`survival-header pop`,children:[`السؤال `,w.currentQuestionIndex+1]}),(0,m.jsx)(`div`,{className:`survival-timer ${x<=5?`pulse`:``}`,children:x}),(0,m.jsxs)(`div`,{className:`survival-header pop`,style:{background:`var(--bg-green)`},children:[A,` ناجي`]})]}),(0,m.jsxs)(`div`,{className:`q-card slide-up`,children:[(0,m.jsx)(`div`,{style:{fontSize:13,fontWeight:900,background:`var(--bg-pink)`,color:`#FFF`,padding:`2px 10px`,display:`inline-block`,marginBottom:12,transform:`rotate(-2deg)`},children:`جاوب صح أو انسحب! 💀`}),(0,m.jsx)(`h2`,{style:{fontSize:24,fontWeight:950,color:`var(--bg-dark-purple)`,lineHeight:1.4,margin:0},children:D.q})]}),(0,m.jsx)(`div`,{style:{display:`grid`,gridTemplateColumns:`1fr 1fr`,gap:14,marginBottom:24},children:D.a.map((e,t)=>{let n=_===t||w.answers[r.uid]?.answer===t,i=O===`reveal`&&t===D.correct,a=O===`reveal`&&n&&t!==D.correct,o=`ans-btn pop`;return n&&(o+=` selected`),i&&(o+=` correct`),a&&(o+=` wrong`),(0,m.jsxs)(`button`,{disabled:!E||O!==`question`||_!==null,onClick:()=>M(t),className:o,style:{boxShadow:n?`none`:`5px 5px 0 var(--bg-dark-purple)`,animationDelay:`${t*80}ms`},children:[(0,m.jsx)(`div`,{style:{width:30,height:30,borderRadius:`50%`,background:`rgba(0,0,0,0.1)`,display:`flex`,alignItems:`center`,justifyContent:`center`,fontSize:14,flexShrink:0},children:j[t]}),(0,m.jsx)(`span`,{style:{flex:1},children:e})]},t)})}),!E&&O===`question`&&(0,m.jsx)(`div`,{style:{textAlign:`center`,padding:10,background:`rgba(231,76,60,0.1)`,color:`var(--bg-pink)`,fontWeight:900,marginBottom:10},children:`لقد خرجت من المسابقة! انتظر انتهاء الجولة... 💀`}),(0,m.jsxs)(`div`,{style:{flex:1,display:`flex`,flexDirection:`column`,justifyContent:`flex-end`},children:[(0,m.jsxs)(`div`,{className:`card`,style:{background:`#FFF`,border:`var(--brutal-border)`,padding:16,marginBottom:16,borderRadius:0},children:[(0,m.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,fontSize:14,fontWeight:900,marginBottom:8,color:`var(--bg-dark-purple)`},children:[(0,m.jsx)(`span`,{children:`تقدم جولة الإجابات`}),(0,m.jsxs)(`span`,{children:[k,` / `,A]})]}),(0,m.jsx)(`div`,{style:{width:`100%`,height:16,background:`var(--bg-dark-purple)`,padding:3,border:`2px solid var(--bg-dark-purple)`},children:(0,m.jsx)(`div`,{style:{width:`${k/(A||1)*100}%`,height:`100%`,background:`var(--bg-yellow)`,transition:`width 0.4s cubic-bezier(0.34,1.56,0.64,1)`}})})]}),T&&(0,m.jsx)(`div`,{style:{display:`flex`,gap:12},children:O===`question`?(0,m.jsx)(`button`,{onClick:N,className:`btn btn-pink`,style:{flex:1,padding:`18px 24px`,fontSize:20,boxShadow:`6px 6px 0 var(--bg-dark-purple)`},children:`اكشف الإجابة 🔍`}):(0,m.jsx)(`button`,{onClick:async()=>{if(!(!T||O!==`reveal`)){if(Object.values(w.alivePlayers).filter(e=>e).length<=1||w.currentQuestionIndex>=w.questions.length-1){await f(e);return}try{await u(e,w.currentQuestionIndex+1)}catch(e){b(e.message)}}},className:`btn btn-green`,style:{flex:1,padding:`18px 24px`,fontSize:20,boxShadow:`6px 6px 0 var(--bg-dark-purple)`},children:A<=1?`نهاية المسابقة 🏁`:`السؤال التالي ➡️`})})]}),y&&(0,m.jsx)(o,{message:y,onDone:()=>b(``)})]})}export{h as default};