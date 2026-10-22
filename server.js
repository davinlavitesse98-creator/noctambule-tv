const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));
app.use(express.json());
const SUPER_ADMIN_CODE = "NOCTA-LBV-1000";
let maintenanceMode = false;
let premiumMode = false;
let premiumPrice = 1000;
const premiumType = "Inscription definitive";
const PAIEMENTS = {
  moov: { actif: true, numero: "+24165538087", nom: "Noctambule TV" },
  airtel: { actif: false, numero: "+24174636895", nom: "Noctambule TV - Reserve" }
};
let bans = {};
let spamReports = {};
function isBanned(tel){ if(!bans[tel]) return false; if(bans[tel].type === 'def') return true; if(bans[tel].type === 'temp' && Date.now() < bans[tel].until) return true; if(bans[tel].type === 'temp' && Date.now() >= bans[tel].until){ delete bans[tel]; return false; } return false; }
app.post('/api/super-admin', (req, res) => {
  const { code, action, tel } = req.body;
  if(code !== SUPER_ADMIN_CODE) return res.status(403).json({error: 'Code faux'});
  if(action === 'fermer'){ maintenanceMode = true; io.emit('appFermee'); }
  if(action === 'ouvrir'){ maintenanceMode = false; io.emit('appOuverte'); }
  if(action === 'premium-on'){ premiumMode = true; io.emit('premiumActive', {actif: true, prix: premiumPrice, type: premiumType, paiements: PAIEMENTS}); }
  if(action === 'premium-off'){ premiumMode = false; io.emit('premiumActive', {actif: false}); }
  if(action === 'bannir'){ bans[tel] = {type: 'def', icon: 'blocage_definitif.png'}; io.emit('userBanned', {tel, ban: bans[tel]}); }
  if(action === 'debannir'){ delete bans[tel]; io.emit('userDebanned', tel); }
  res.json({ok: true, maintenanceMode, premiumMode, premiumPrice, premiumType, paiements: PAIEMENTS});
});
app.get('/api/status', (req, res) => { res.json({ maintenanceMode, premiumMode, premiumPrice, premiumType, paiements: PAIEMENTS }); });
io.on('connection', socket => {
  socket.on('register', (data) => {
    if(isBanned(data.tel)){ socket.emit('banned', bans[data.tel]); return; }
    const code = Math.floor(100000 + Math.random()*900000);
    console.log(`CODE POUR ${data.tel}: ${code}`);
    socket.emit('codeEnvoye', code);
  });
  socket.on('signalSpam', ({reportedTel}) => {
    spamReports[reportedTel] = (spamReports[reportedTel] || 0) + 1;
    if(spamReports[reportedTel] === 1){ bans[reportedTel] = {type: 'temp', until: Date.now()+3*60*60*1000, icon: 'blocage_temporaire.png'}; } else { bans[reportedTel] = {type: 'def', icon: 'blocage_definitif.png'}; }
    io.emit('userBanned', {tel: reportedTel, ban: bans[reportedTel]});
  });
});
server.listen(3000, () => console.log('Noctambule TV OK - MOOV +24165538087 ACTIF - Premium 1000F pret - Port 3000'));
