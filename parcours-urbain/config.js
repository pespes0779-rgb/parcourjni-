/* =====================================================================
   CONFIG.JS  -  C'est le SEUL fichier à modifier pour changer le jeu.
   Ouvrez-le avec le Bloc-notes ou VS Code, enregistrez, puis rechargez la page.
   Les coordonnées [x, y] sont en pixels sur l'image du plan (0,0 = coin haut gauche).
   Astuce : dans le jeu, bouton « Éditeur » puis cliquez sur le plan pour lire x, y.
   ===================================================================== */
window.CONFIG = {

  /* ---- Textes de l'accueil ---- */
  titre: "Parcours urbain",
  sousTitre: "Image mentale du quartier · lecture du tissu urbain",
  intro: "Partez du marché, avancez le long du tracé noir jusqu'à la place des Martyrs, écoutez l'ambiance de chaque lieu et répondez aux questions d'analyse.",

  /* ---- Plan de fond (2000 x 1538 px) ---- */
  plan: "images/plan.jpg",

  /* Le tracé noir est dessiné par le jeu à partir de "trace" (il n'est pas dans l'image).
     Si votre plan contient déjà une ligne, mettez false pour ne pas la doubler.
     Ici le plan a déjà un trait noir : le jeu le recouvre exactement. */
  afficherTrace: true,

  /* Échelle : combien de mètres vaut 1 pixel du plan (voir LISEZ-MOI pour le calcul). */
  metresParPixel: 0.5,
  version: "v1.1",

  /* Nombre d'erreurs autorisées au total avant de recommencer le parcours */
  essais: 3,

  /* Mode administrateur : ouvrez la page avec  index.html#admin  (ou #admin-CODE si codeAdmin est défini). */
  codeAdmin: "",

  /* Vitesse de marche (pixels du plan par seconde) */
  vitesse: 95,

  /* ---- Rues / quartiers affichés dans le bandeau en haut du plan ---- */
  lieux: [
    { x:1278, y:1110, rue:"Voie principale sud",     quartier:"Zone du marché" },
    { x:1278, y:830,  rue:"Voie principale sud",     quartier:"Équipements (hôpital, commissariat)" },
    { x:1278, y:640,  rue:"Nœud majeur nord-est",    quartier:"École et banque" },
    { x:1000, y:598,  rue:"Voie principale nord",    quartier:"Zone bâtie" },
    { x:720,  y:612,  rue:"Voie principale nord",    quartier:"Quartier de la mosquée" },
    { x:450,  y:618,  rue:"Nœud majeur ouest",       quartier:"Café et place des Martyrs" }
  ],

  /* ---- Classement partagé (voir LISEZ-MOI et supabase.sql) ---- */
  classement: { supabaseUrl: "", supabaseCle: "" },

  /* ---- Tracé noir : le joueur part du marché (sud-est), monte, puis va vers l'ouest jusqu'au café ---- */
  trace: [[1278,1133],[1280,594],[1200,591],[1100,596],[900,603],[800,607],[700,615],[550,625],[470,626],[445,622],[433,613]],

  /* ---- Points d'analyse obligatoires ----
     x, y : position sur le plan (projetée sur le tracé) | tag, titre, texte | image:"" = zoom du plan
     question, choix:[...], reponse (0 = première), explication. Sans "question" : point informatif. */
  points: [
    { x:1277, y:965, tag:"Point d'analyse 1 · Repère", titre:"Le marché",
      texte:"Au départ du parcours, le marché forme une grande masse visuelle sur la voie principale sud. Regardez son volume, son activité et sa place dans le quartier.",
      question:"Dans la légende du plan, quel rôle joue le marché ?",
      choix:["Un repère : masse visuelle dominante","Une limite naturelle","Un nœud mineur","Une zone non bâtie"], reponse:0,
      explication:"Le marché est signalé par une étoile : c'est un repère dont la masse visuelle domine son environnement.",
      image:"" },
    { x:1277, y:593, tag:"Point d'analyse 2 · Nœud", titre:"Le nœud majeur du coin nord-est",
      texte:"Le tracé tourne ici à angle droit vers l'ouest. Les voies se croisent, la vue change de direction et le piéton doit choisir son chemin.",
      question:"Que représente un nœud majeur (point rouge) dans l'image mentale ?",
      choix:["Un point de rupture et de décision important","Une simple connexion locale","Une limite visuelle du jardin","Une zone résidentielle"], reponse:0,
      explication:"Le nœud majeur est un point de rupture et de décision. Le nœud mineur n'est qu'une connexion locale.",
      image:"" },
    { x:720, y:612, tag:"Point d'analyse 3 · Repère vertical", titre:"Le minaret de la mosquée",
      texte:"Sur la voie nord, le minaret dépasse nettement du bâti horizontal. On le voit de loin, ce qui aide à s'orienter.",
      question:"Quel rôle joue le minaret dans la lecture du quartier ?",
      choix:["Point d'orientation vertical","Voie secondaire","Zone non bâtie","Limite de flux"], reponse:0,
      explication:"Le minaret est un repère vertical : il oriente le piéton dans tout le quartier.",
      image:"" },
    { x:466, y:600, tag:"Point d'analyse 4 · Place", titre:"Le café et la place des Martyrs",
      texte:"Le parcours se termine au nœud majeur ouest, près du café. La place des Martyrs est le grand vide vert qui s'ouvre à côté du bâti dense.",
      question:"Dans la légende, à quelle catégorie appartient la place des Martyrs ?",
      choix:["Un repère central et historique (zone non bâtie : place, jardin)","Une voie rapide","Un nœud mineur","Une zone bâtie d'immeubles résidentiels"], reponse:0,
      explication:"La place est une zone non bâtie, en vert sur le plan, et un repère central et historique du quartier.",
      image:"" }
  ],

  /* ---- Repères facultatifs (bouton « œil » quand on s'approche) ----
     portee : distance (pixels du plan) à laquelle le bouton apparaît (défaut 75) */
  reperes: [
    { x:1363, y:950, portee:110, titre:"Le marché",                 texte:"Repère signalé par une étoile sur le plan : masse visuelle dominante. À compléter : histoire et description du marché.", image:"" },
    { x:1365, y:820, portee:110, titre:"Futur hôpital",             texte:"À compléter : description du projet d'hôpital.", image:"" },
    { x:1355, y:660, portee:95,  titre:"Commissariat de police",    texte:"Repère institutionnel et sécuritaire, signalé par une étoile sur le plan. À compléter : description.", image:"" },
    { x:1240, y:548, portee:90,  titre:"École (collège)",           texte:"Repère institutionnel et fonctionnel, signalé par une étoile sur le plan. À compléter : description.", image:"" },
    { x:1312, y:540, portee:90,  titre:"Banque BNA",                texte:"À compléter : description de l'agence BNA.", image:"" },
    { x:722,  y:678, portee:95,  titre:"La mosquée",                texte:"Minaret : point d'orientation vertical. À compléter : histoire et description de la mosquée.", image:"" },
    { x:517,  y:662, portee:80,  titre:"Algérie Télécom",           texte:"À compléter : description du bâtiment.", image:"" },
    { x:470,  y:665, portee:80,  titre:"Siège de la daïra",         texte:"À compléter : description du siège de la daïra.", image:"" },
    { x:566,  y:603, portee:70,  titre:"Le café",                   texte:"À compléter : description du café, lieu de rencontre près de la place.", image:"" },
    { x:462,  y:560, portee:90,  titre:"Place des Martyrs",         texte:"Repère central et historique : zone non bâtie (place, jardin). À compléter : histoire de la place.", image:"" }
  ],

  /* ---- Ambiances sonores le long du tracé ----
     son : "marche" | "police" | "ecole" | "calme" | "circulation"   rayon : distance d'influence */
  ambiances: [
    { x:1278, y:1010, son:"marche",      nom:"Zone du marché",          rayon:110 },
    { x:1278, y:830,  son:"circulation", nom:"Hôpital et circulation",  rayon:110 },
    { x:1278, y:660,  son:"police",      nom:"Commissariat",            rayon:100 },
    { x:1250, y:594,  son:"ecole",       nom:"École",                   rayon:100 },
    { x:1020, y:598,  son:"circulation", nom:"Banque et circulation",   rayon:140 },
    { x:720,  y:612,  son:"calme",       nom:"Quartier de la mosquée",  rayon:130 },
    { x:550,  y:624,  son:"circulation", nom:"Rue de la daïra",         rayon:100 },
    { x:440,  y:616,  son:"calme",       nom:"Place des Martyrs",       rayon:110 }
  ],

  /* ---- Vos propres sons (facultatif) ----
     Exemple : fichiersSon: { marche:"sons/marche.mp3", police:"sons/radio.mp3" } */
  fichiersSon: {}
};
