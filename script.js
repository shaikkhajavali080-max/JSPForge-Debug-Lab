const modules = [
  {
    id:1,name:"Declaration Scope",file:"profile.jsp",bugLine:3,
    title:"Request-specific data in <%! %>",
    desc:"The mutable request value is declared at JSP class level.",
    tip:"Move studentName into the request-processing block. A JSP declaration becomes a servlet class member.",
    why:"The container translates <%! ... %> into a servlet class member. One servlet instance can handle many requests, so mutable request-specific data should not be stored in a shared field. Keep it inside the request-processing code.",
    fixedLines:["<%@ page language=\"java\" %>","<%","String studentName = request.getParameter(\"name\");","%>","<p>Hello <%= studentName %></p>"],
    brokenLines:["<%@ page language=\"java\" %>","<%!","String studentName = \"\";","%>","<% studentName = request.getParameter(\"name\"); %>","<p>Hello <%= studentName %></p>"]
  },
  {
    id:2,name:"Forward vs Redirect",file:"login.jsp",bugLine:4,
    title:"Server forward used for a client redirect",
    desc:"The code uses <jsp:forward> when a browser redirect is expected.",
    tip:"Use response.sendRedirect(...) when you need a new browser request and a changed URL.",
    why:"<jsp:forward> performs a server-side dispatch using the current request. The browser does not make a new request. sendRedirect() sends a redirect response, causing the browser to make a new request to the target URL.",
    fixedLines:["<%@ page language=\"java\" %>","<% boolean valid = true; %>","<% if (valid) {","    response.sendRedirect(\"dashboard.jsp\");","    return;","} %>","<p>Login page</p>"],
    brokenLines:["<%@ page language=\"java\" %>","<% boolean valid = true; %>","<% if (valid) { %>","<jsp:forward page=\"dashboard.jsp\" />","<% } %>","<p>Login page</p>"]
  },
  {
    id:3,name:"Request vs Session",file:"dashboard.jsp",bugLine:6,
    title:"requestScope and sessionScope mixed up",
    desc:"A request-specific notice is being read from session scope.",
    tip:"The attribute was stored with request.setAttribute(), so read it with requestScope.",
    why:"requestScope maps to request attributes and normally lasts for the current request. sessionScope maps to HttpSession and can persist across requests. The scope used for reading should match the scope used for storing the data.",
    fixedLines:["<%@ page language=\"java\" %>","<% request.setAttribute(\"notice\", \"Welcome\"); %>","<% session.setAttribute(\"user\", \"Student\"); %>","<p>${sessionScope.user}</p>","<p>${requestScope.notice}</p>"],
    brokenLines:["<%@ page language=\"java\" %>","<% request.setAttribute(\"notice\", \"Welcome\"); %>","<% session.setAttribute(\"user\", \"Student\"); %>","<p>${sessionScope.user}</p>","<p>${requestScope.notice}</p>","<p>${sessionScope.notice}</p>"]
  }
];

let current=0;
let solved=new Set(JSON.parse(sessionStorage.getItem("cpSolved")||"[]"));
let submitted=new Set(JSON.parse(sessionStorage.getItem("cpSubmitted")||"[]"));
let fixedState=new Set();

const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

function save(){
  sessionStorage.setItem("cpSolved",JSON.stringify([...solved]));
  sessionStorage.setItem("cpSubmitted",JSON.stringify([...submitted]));
}
function initials(name){
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"ST";
}
function updateProgress(){
  const pct=Math.round(solved.size/modules.length*100);
  $("heroSolved").textContent=`${solved.size} / ${modules.length}`;
  $("sideProgress").textContent=pct+"%";
  $("sideBar").style.width=pct+"%";
  $("heroBar").style.width=pct+"%";
}
function renderChallenges(){
  $("challengeList").innerHTML=modules.map((m,i)=>`
    <div class="challenge ${i===current?"active":""}" data-i="${i}">
      <b>${String(m.id).padStart(2,"0")} · ${m.name}</b>
      <span class="check">${solved.has(i)?"✓":""}</span>
      <small>${m.desc}</small>
    </div>`).join("");
  document.querySelectorAll(".challenge").forEach(el=>{
    el.onclick=()=>{current=Number(el.dataset.i);renderModule();}
  });
}
function renderEditor(lines,badLine=null,good=false){
  $("editor").innerHTML=lines.map((line,i)=>{
    const n=i+1;
    return `<div class="line ${badLine===n?"bad":""} ${good?"fixed":""}" data-line="${n}">
      <span class="num">${n}</span><span class="code">${escapeHtml(line)}</span>
    </div>`;
  }).join("");
}
function resetConsole(){
  $("consoleState").textContent="READY";
  $("consoleBody").textContent="Run the debugger to inspect the JSP.";
  $("inspectState").textContent="READY";
  $("issueTitle").textContent="No issue inspected";
  $("issueDesc").textContent="Run the debug check to identify the simulated JSP problem.";
  $("whyBox").textContent="The JSP is translated into a servlet. Translation and servlet lifecycle determine where code and state live.";
  $("fixedCode").textContent="Run the debugger to view the corrected pattern.";
}
function renderModule(){
  const m=modules[current];
  fixedState.delete(current);
  $("fileName").textContent=m.file;
  $("fileStatus").textContent="Broken starter file";
  $("bugBadge").textContent="BUGGY";
  renderEditor(m.brokenLines);
  resetConsole();
  $("reportText").value="";
  $("reportStatus").textContent=submitted.has(current)?"Submitted ✓":"Not submitted";
  $("reportStatus").style.color=submitted.has(current)?"#15803d":"";
  $("reportStatus").style.background=submitted.has(current)?"#ecfdf3":"";
  $("submitBtn").disabled=true;
  $("downloadBtn").disabled=true;
  renderChallenges();
  updateProgress();
}
function runDebug(){
  const m=modules[current];
  if(fixedState.has(current)){
    solved.add(current); save(); updateProgress(); renderChallenges();
    $("consoleState").textContent="PASS";
    $("consoleBody").innerHTML='<div class="success">✓ Corrected pattern validated successfully.</div><div>The simulated JSP now follows the expected lifecycle rule.</div>';
    $("inspectState").textContent="PASS";
    $("issueTitle").textContent="No remaining issue";
    $("issueDesc").textContent="The corrected pattern matches the expected solution for this module.";
    $("whyBox").textContent=m.why;
    $("fixedCode").textContent=m.fixedLines.join("\n");
    $("fileStatus").textContent="Validated corrected file";
    $("bugBadge").textContent="PASS";
    $("downloadBtn").disabled=false;
    $("reportHint").textContent="Write at least 30 characters about the root cause.";
    $("submitBtn").disabled=$("reportText").value.trim().length<30;
    return;
  }
  $("fileStatus").textContent="Issue detected";
  $("bugBadge").textContent="1 ISSUE";
  renderEditor(m.brokenLines,m.bugLine,false);
  $("consoleState").textContent="ISSUE FOUND";
  $("consoleBody").innerHTML=`<div class="error">✖ Issue detected at line ${m.bugLine}.</div><div>Review the highlighted line, then apply or write the correction.</div>`;
  $("inspectState").textContent="ISSUE FOUND";
  $("issueTitle").textContent=m.title;
  $("issueDesc").textContent=m.desc;
  $("whyBox").textContent=m.why;
  $("fixedCode").textContent=m.fixedLines.join("\n");
}
function applyFix(){
  const m=modules[current];
  fixedState.add(current);
  renderEditor(m.fixedLines,null,true);
  $("fileStatus").textContent="Corrected — run validation";
  $("bugBadge").textContent="FIXED";
  $("consoleState").textContent="READY TO VALIDATE";
  $("consoleBody").innerHTML='<div class="success">✓ Corrected code loaded into the editor.</div><div>Click Run Debug Check to validate the fix.</div>';
  $("inspectState").textContent="CORRECTED";
  $("issueTitle").textContent="Fix applied";
  $("issueDesc").textContent="The corrected JSP pattern is loaded. Validate it before submitting.";
  $("whyBox").textContent=m.why;
  $("fixedCode").textContent=m.fixedLines.join("\n");
  $("downloadBtn").disabled=true;
  $("reportHint").textContent="Validate the fix, then write at least 30 characters.";
  $("submitBtn").disabled=true;
}
function showHint(){
  const m=modules[current];
  $("consoleState").textContent="HINT";
  $("consoleBody").innerHTML=`<div class="hint-text">✦ ${m.tip}</div>`;
  $("inspectState").textContent="HINT";
  $("issueTitle").textContent="Debug hint";
  $("issueDesc").textContent=m.tip;
}
function downloadJsp(){
  if(!fixedState.has(current)||!solved.has(current)){alert("Run Debug Check after applying the fix before downloading.");return;}
  const m=modules[current];
  const blob=new Blob([m.fixedLines.join("\n")+"\n"],{type:"text/plain"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=m.file; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
function submitReport(){
  if(!solved.has(current)){alert("Validate the corrected code first.");return;}
  const text=$("reportText").value.trim();
  if(text.length<30){alert("Please write at least 30 characters.");return;}
  submitted.add(current); save();
  $("reportStatus").textContent="Submitted ✓";
  $("reportStatus").style.color="#15803d";
  $("reportStatus").style.background="#ecfdf3";
  $("reportHint").textContent="Explanation submitted successfully.";
}
function renderResults(){
  const pct=Math.round(solved.size/modules.length*100);
  $("bigScore").textContent=pct+"%";
  $("resultTitle").textContent=pct===100?"Lab completed!":"Your progress";
  $("resultText").textContent=pct===100?"Excellent — all three modules are solved.":"Solve and validate all three modules to complete the lab.";
  $("resultList").innerHTML=modules.map((m,i)=>`
    <div class="result-row"><span>${m.name}</span><b>${solved.has(i)?"SOLVED ✓":"PENDING"}</b></div>`).join("");
}
$("loginBtn").onclick=()=>{
  const name=$("studentName").value.trim()||"Student";
  const ini=initials(name);
  $("sideName").textContent=name;$("avatar").textContent=ini;$("topAvatar").textContent=ini;
  sessionStorage.setItem("cpName",name);
  $("login").classList.add("hidden");$("workspace").classList.remove("hidden");
  renderModule();
};
$("studentName").addEventListener("keydown",e=>{if(e.key==="Enter")$("loginBtn").click();});
$("runBtn").onclick=runDebug;
$("fixBtn").onclick=applyFix;
$("hintBtn").onclick=showHint;
$("resetBtn").onclick=renderModule;
$("downloadBtn").onclick=downloadJsp;
$("reportText").oninput=()=>{$("submitBtn").disabled=!solved.has(current)||$("reportText").value.trim().length<30};
$("submitBtn").onclick=submitReport;
document.querySelectorAll(".nav").forEach(n=>n.onclick=()=>{
  document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));n.classList.add("active");
  const v=n.dataset.view;
  $("labView").classList.toggle("hidden",v!=="lab");
  $("guideView").classList.toggle("hidden",v!=="guide");
  $("resultsView").classList.toggle("hidden",v!=="results");
  $("pageTitle").textContent=v==="lab"?"JSP Debug Lab":v==="guide"?"Lifecycle Guide":"Lab Results";
  if(v==="results")renderResults();
});
$("backLab").onclick=()=>document.querySelector('[data-view="lab"]').click();

function startFreshSession(){
  sessionStorage.removeItem("cpName");
  sessionStorage.removeItem("cpSolved");
  sessionStorage.removeItem("cpSubmitted");
  solved.clear();
  submitted.clear();
  fixedState.clear();
  current=0;
  $("workspace").classList.add("hidden");
  $("login").classList.remove("hidden");
  $("studentName").value="";
  $("reportText").value="";
  updateProgress();
  renderChallenges();
  renderModule();
}
$("logoutBtn").onclick=()=>{
  if(confirm("Logout and clear this session's progress?")){
    startFreshSession();
  }
};
$("newSessionBtn").onclick=()=>{
  if(confirm("Start a new session? Current progress will be cleared.")){
    startFreshSession();
  }
};

document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==="Enter"&&!$("workspace").classList.contains("hidden")){e.preventDefault();runDebug();}
});
const savedName=sessionStorage.getItem("cpName");
if(savedName){$("studentName").value=savedName;}
renderChallenges();
updateProgress();
