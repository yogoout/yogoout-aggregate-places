var http = require('https');
var fs = require("fs");
var async = require('async');
var baseConverter = require('base-converter');
var md5 = require('md5');
//var slug = require('slug');// ne fonctionne pas correctement supprime les +


var departements = [];
var resumeStatistiquesDepartementRegionfrance = [];
var codeInseeCodePostaux = [];
var departementsGeoJson = {};
var regionsGeoJson= {};

//récuperer des dataset depuis public.opendatasoft.com qui héberge des données d'etalab
function retrieveDataFromEtalab (dataSet,cb) {
	
	//test if file already present localy 
	fs.readFile('data/' + dataSet + '.json', "utf-8", function (err, data) {
	  if (err) {
	  	//retrieve from etalab	
			console.log('Could not find ' + dataSet + ' localy --> download it');
			//https://public.opendatasoft.com/explore/dataset/' + dataSet + '/download/?format=json&timezone=Europe/Berlin
			var options = {
			  hostname: 'public.opendatasoft.com',
			  port: 443,
			  path: '/explore/dataset/' + dataSet + '/download/?format=json&timezone=Europe/Berlin',
			  method: 'GET'
			};
			http.get(options, function(response) {
			  console.log('Downloading ' + dataSet + ': ' + response.statusCode);
			  var data = '';
	      response.on('data', function(d) {
	          data += d;
	      });
	      response.on('end', function() {
	      		console.log('Downloaded ' + dataSet + ': ' + response.statusCode);
	          fs.writeFile('data/' + dataSet + '.json', data); 
	          cb(null, data);
	      });
			  
			}).on('error', function(e) {
			  console.log("Error while downloading: " + e.message);
			  cb("Error while downloading: " + e.message);
			});
	
		}
		else {
			console.log('use local file ' + dataSet );
			cb(null,data);
		}
	});
}




// Récupération des départements en minuscule
function retrieveDepartements (callback) {
	//test if file already present localy 
	fs.readFile('data/departements.json', "utf-8", function (error, data) {
	  if (error) {
	  	//retrieve from etalab	
			console.log('Could not find departements localy' + error);
			callback(error);
		}
		else {
			
			departements= JSON.parse(data);
			console.log('departements retrieved');
			callback(null,departements);
		}
	});
}

// Récupération des départements en geojson
function retrieveDepartementsGeoJson (callback) {
	//test if file already present localy 
	fs.readFile('data/departements.geojson', "utf-8", function (error, data) {
	  if (error) {
	  	//retrieve from etalab	
			console.log('Could not find departements.geojson localy' + error);
			callback(error);
		}
		else {
			
			departementsGeoJson= JSON.parse(data);
			console.log('departements.geojson retrieved');
			callback(null,departementsGeoJson);
		}
	});
}
// Récupération des régions en geojson
function retrieveRegionsGeoJson (callback) {
	//test if file already present localy 
	fs.readFile('data/regions.geojson', "utf-8", function (error, data) {
	  if (error) {
	  	//retrieve from etalab	
			console.log('Could not find regions.geojson localy' + error);
			callback(error);
		}
		else {
			
			regionsGeoJson= JSON.parse(data);
			console.log('regions.geojson retrieved');
			callback(null,regionsGeoJson);
		}
	});
}


//récupération des données d'etalab : resume-statistique-communes-departements-et-regions-france-2012-2013-2014
// permet de récupérer les informations :  region, departement, libelle_commune_ou_arm population_en_2012 et la clef codgeo
function retrieveStatistiquesDepartementRegionfrance (callback) {

	retrieveDataFromEtalab('resume-statistique-communes-departements-et-regions-france-2012-2013-2014', function (error,data) {
		console.log("retrieve resume-statistique-communes-departements-et-regions-france-2012-2013-2014");
		if (error) {
			//console.log(data);
			console.log(error);
			callback(error);
		}
		else {
			//console.log(data);
			resumeStatistiquesDepartementRegionfrance=JSON.parse(data);
			console.log('resume-statistique-communes-departements-et-regions-france-2012-2013-2014 retrieved');
			callback(null, resumeStatistiquesDepartementRegionfrance);
			}
	});
}


//récupération des données d'etalab : code-insee-postaux-geoflar
// permet de récupérer les informations :  CODE INSEE (poste): INSEE_COM(geofla) : code_postal  commune(à ne pas garder majuscules), , geo_shape, geo_point_2d, code_commune_insee
// certaines clefs permettent de faire le lien avec les autres référentiels CODE_DEPT, CODE_REG
//https://public.opendatasoft.com/explore/dataset/code-insee-postaux-geoflar/?tab=table
//Note :  Les territoires d'outre-mer et Monaco n'ont pas de correspondance.
//Note : il semble y avoir quelques erreurs, voir réutilisation des données sur le site etalab
//				CORRIGE (csv): https://www.data.gouv.fr/s/resources/base-officielle-des-codes-postaux/community/20150308-152148/code_postaux_v201410_corr.csv

function retrieveCodeInseeCodePostaux (callback) {
	
	retrieveDataFromEtalab('code-insee-postaux-geoflar', function (error,data) {
		console.log("retrieve code-insee-postaux-geoflar");
		if (error) {
			//console.log(data);
			console.log(error);
			callback(error);

		}
		else {
			//console.log(data);
			codeInseeCodePostaux=JSON.parse(data);
			console.log('code-insee-postaux-geoflar retrieved');
			callback(null, codeInseeCodePostaux);
			}
	});

}

//transfome les données de région pour le smettre au format attendu
function aggregateRegions () {
	var results= [];//résultats finaux de l'agregation des données
	var regions=regionsGeoJson.features;
	for (var tmpData in regions) {
		
		
		
		var place = { uid: '',
    name: regions[tmpData].properties.nom,
    type: 'places',
    sub_type: 'region',
    postal_code: '',
    locality: '',
    district: '',
    departement: '',
    region: regions[tmpData].properties.nom,
    state: '',
    country: 'FR',
    //geolocation: [ 43.29990094363675,5.382278697952184],
    geoshape: { type: 'Polygon', coordinates: regions[tmpData].geometry.coordinates },
    source : "www.etalab.gouv.fr" };
    
    var base10l = baseConverter.hexToDec(md5(place.country + place.state +place.region+place.departement+place.district +place.locality).substr(0,7)).toString().replace('.', '').substr(0,10);
		
		place.uid = 'fr' + base10l;
		place.slug= 'l'+base10l + '-' + place.name.replace(' ', '+')
		.replace('é', 'e')
		.replace('è', 'e')
		.replace('ê', 'e')
		.replace('ë', 'e')
		.replace('ï', 'i')
		.replace('î', 'i')
		.replace('û', 'u')
		.replace('ù', 'u')
		.replace('ü', 'u')
		.replace('ö', 'o')
		.replace('ô', 'o')
		.replace('à', 'a')
		.replace('Î', 'I')
		.replace('É', 'E')
		.replace('È', 'E')
		.replace('ç', 'c')
		;
		
		if (place.name=="Alsace") {
			place.geolocation = [48.25,7.525];
			place.popularity = 1868773;
		}
		else if (place.name=="Aquitaine") {
			place.geolocation = [44.2275,-0.1845];
			place.popularity = 3335134;
		} 
		else if (place.name=="Auvergne") {
			place.geolocation = [45.78344727,3.256097561];
			place.popularity = 1359402;
		} 
		else if (place.name=="Basse-Normandie") {
			place.geolocation = [48.95,-0.475];
			place.popularity = 1478211;
		} 
		else if (place.name=="Bourgogne") {
			place.geolocation = [47.25,4.075];
			place.popularity = 1638492;
		} 
		else if (place.name=="Bretagne") {
			place.geolocation = [48.1,-3.075];
			place.popularity = 3273343;
		} 
		else if (place.name=="Centre") {
			place.geolocation = [47.6535,1.572];
			place.popularity = 2577474;
		} 
		else if (place.name=="Champagne-Ardenne") {
			place.geolocation = [48.875,4.625];
			place.popularity = 1338122;
		} 
		else if (place.name=="Corse") {
			place.geolocation = [442.2,9.05];
			place.popularity = 323092;
		} 
		else if (place.name=="Franche-Comté") {
			place.geolocation = [47.1875,6.25];
			place.popularity = 1178937;
		} 
		else if (place.name=="Haute-Normandie") {
			place.geolocation = [49.3625,0.9375];
			place.popularity = 1851909;
		} 
		else if (place.name=="Île-de-France") {
			place.geolocation = [48.675,2.5];
			place.popularity = 12005077;
		} 
		else if (place.name=="Languedoc-Roussillon") {
			place.geolocation = [43.5993652,3.6711069415];
			place.popularity = 2757558;
		} 
		else if (place.name=="Limousin") {
			place.geolocation = [45.752685545,1.3811444655];
			place.popularity = 735880;
		} 
		else if (place.name=="Lorraine") {
			place.geolocation = [48.75,6.25];
			place.popularity = 2346292;
		}
		else if (place.name=="Midi-Pyrénées") {
			place.geolocation = [43.824951175,1.4848968105];
			place.popularity = 2967153;
		}
		else if (place.name=="Nord-Pas-de-Calais") {
			place.geolocation = [50.525,2.9];
			place.popularity = 4058332;
		}
		else if (place.name=="Pays de la Loire") {
			place.geolocation = [47.4125,-0.85];
			place.popularity = 3689465;
		}
		else if (place.name=="Picardie") {
			place.geolocation = [49.6,2.825];
			place.popularity = 1927387;
		}
		else if (place.name=="Poitou-Charentes") {
			place.geolocation = [46.1375,-0.175];
			place.popularity = 1796434;
		}
		else if (place.name=="Provence-Alpes-Côte d'Azur") {
			place.geolocation = [44.04,5.917];
			place.popularity = 4964859;
		}
		else if (place.name=="Rhône-Alpes") {
			place.geolocation = [45.31,5.42];
			place.popularity = 6448921;
		}
		else if (place.name=="Guadeloupe") {
			place.geolocation = [16.247613,-61.6423826];
			place.popularity = 403750;
		}
		else if (place.name=="Martinique") {
			place.geolocation = [14.651614, -61.016132];
			place.popularity = 381326;
		}
		else if (place.name=="Guyane") {
			place.geolocation = [4.2775998,-53.203918];
			place.popularity = 250377;
		}
		else if (place.name=="La Réunion") {
			place.geolocation = [-21.0957665,55.5079387];
			place.popularity = 843617;
		}
		
    results.push(place); 
		
	}
	//console.log(JSON.stringify(results));
	fs.writeFile("data/places_france_regions.json", JSON.stringify(results), function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("The file data/places_france_regions.json was saved!");
	});
}


//transfome les données de région pour le smettre au format attendu
function aggregateDepartements () {
	var results= [];//résultats finaux de l'agregation des données
	var departements=departementsGeoJson.features;
	for (var tmpData in departements) {
		
		
		
		var place = { uid: '',
    name: departements[tmpData].properties.nom,
    type: 'places',
    sub_type: 'departement',
    postal_code: '',
    locality: '',
    district: '',
    departement: '',
    region: departements[tmpData].properties.nom,
    state: '',
    country: 'FR',
    //geolocation: [ 43.29990094363675,5.382278697952184],
    geoshape: { type: 'Polygon', coordinates: departements[tmpData].geometry.coordinates },
    source : "www.etalab.gouv.fr" };
    
    var base10l = baseConverter.hexToDec(md5(place.country + place.state +place.region+place.departement+place.district +place.locality).substr(0,7)).toString().replace('.', '').substr(0,10);
		
		place.uid = 'fr' + base10l;
		place.slug= 'l'+base10l + '-' + place.name.replace(' ', '+')
		.replace('é', 'e')
		.replace('è', 'e')
		.replace('ê', 'e')
		.replace('ë', 'e')
		.replace('ï', 'i')
		.replace('î', 'i')
		.replace('û', 'u')
		.replace('ù', 'u')
		.replace('ü', 'u')
		.replace('ö', 'o')
		.replace('ô', 'o')
		.replace('à', 'a')
		.replace('Î', 'I')
		.replace('É', 'E')
		.replace('È', 'E')
		.replace('ç', 'c')
		;
		
if (place.name=="Ain") {place.geolocation = [46.2051675,5.2255007], place.popularity = 612191;}
if (place.name=="Aisne") {place.geolocation = [49.564133,3.61989], place.popularity = 540888;}
if (place.name=="Allier") {place.geolocation = [46.568059,3.334417], place.popularity = 342911;}
if (place.name=="Alpes-de-Haute-Provence") {place.geolocation = [44.092193,6.235976], place.popularity = 161241;}
if (place.name=="Alpes-Maritimes") {place.geolocation = [43.7101728,7.2619532], place.popularity = 1082014;}
if (place.name=="Ardèche") {place.geolocation = [44.735269,4.599039], place.popularity = 318407;}
if (place.name=="Ardennes") {place.geolocation = [49.762085,4.726096], place.popularity = 282778;}
if (place.name=="Ariège") {place.geolocation = [42.964127,1.605232], place.popularity = 152366;}
if (place.name=="Aube") {place.geolocation = [48.2973451,4.0744009], place.popularity = 305606;}
if (place.name=="Aude") {place.geolocation = [43.212161,2.353663], place.popularity = 362339;}
if (place.name=="Aveyron") {place.geolocation = [44.349389,2.575986], place.popularity = 276229;}
if (place.name=="Bas-Rhin") {place.geolocation = [48.5734053,7.7521113], place.popularity = 1104667;}
if (place.name=="Bouches-du-Rhône") {place.geolocation = [43.296482,5.36978], place.popularity = 1984784;}
if (place.name=="Calvados") {place.geolocation = [49.182863,-0.370679], place.popularity = 687854;}
if (place.name=="Cantal") {place.geolocation = [44.930953,2.444997], place.popularity = 147415;}
if (place.name=="Charente") {place.geolocation = [45.648377,0.1562369], place.popularity = 353657;}
if (place.name=="Charente-Maritime") {place.geolocation = [46.160329,-1.151139], place.popularity = 628733;}
if (place.name=="Cher") {place.geolocation = [47.081012,2.398782], place.popularity = 311897;}
if (place.name=="Corrèze") {place.geolocation = [45.26565,1.771697], place.popularity = 241247;}
if (place.name=="Corse-du-Sud") {place.geolocation = [41.919229,8.738635], place.popularity = 145429;}
if (place.name=="Côte-d'Or") {place.geolocation = [47.322047,5.04148], place.popularity = 527403;}
if (place.name=="Côtes-d'Armor") {place.geolocation = [48.51418,-2.765835], place.popularity = 595531;}
if (place.name=="Creuse") {place.geolocation = [46.169599,1.871452], place.popularity = 121517;}
if (place.name=="Deux-Sèvres") {place.geolocation = [46.323716,-0.464777], place.popularity = 371583;}
if (place.name=="Dordogne") {place.geolocation = [45.184029,0.7211149], place.popularity = 416384;}
if (place.name=="Doubs") {place.geolocation = [47.237829,6.0240539], place.popularity = 531062;}
if (place.name=="Drôme") {place.geolocation = [44.933393,4.89236], place.popularity = 491334;}
if (place.name=="Essonne") {place.geolocation = [48.629828,2.441782], place.popularity = 1237507;}
if (place.name=="Eure") {place.geolocation = [49.0270129,1.151361], place.popularity = 591616;}
if (place.name=="Eure-et-Loir") {place.geolocation = [48.443854,1.489012], place.popularity = 432107;}
if (place.name=="Finistère") {place.geolocation = [47.997542,-4.097899], place.popularity = 901293;}
if (place.name=="Gard") {place.geolocation = [43.836699,4.360054], place.popularity = 725618;}
if (place.name=="Gers") {place.geolocation = [43.64638,0.586709], place.popularity = 189530;}
if (place.name=="Gironde") {place.geolocation = [44.837789,-0.57918], place.popularity = 1483712;}
if (place.name=="Guadeloupe") {place.geolocation = [48.8788472,-0.5157492], place.popularity = 403314;}
if (place.name=="Guyane") {place.geolocation = [48.748573,-0.002211], place.popularity = 239648;}
if (place.name=="Haute-Corse") {place.geolocation = [42.697283,9.450881], place.popularity = 170828;}
if (place.name=="Haute-Garonne") {place.geolocation = [43.604652,1.444209], place.popularity = 1279349;}
if (place.name=="Haute-Loire") {place.geolocation = [45.042768,3.882936], place.popularity = 225686;}
if (place.name=="Haute-Marne") {place.geolocation = [48.113748,5.1392559], place.popularity = 182136;}
if (place.name=="Hautes-Alpes") {place.geolocation = [44.559638,6.079758], place.popularity = 139554;}
if (place.name=="Haute-Saône") {place.geolocation = [47.619788,6.15428], place.popularity = 239750;}
if (place.name=="Haute-Savoie") {place.geolocation = [45.899247,6.129384], place.popularity = 756501;}
if (place.name=="Hautes-Pyrénées") {place.geolocation = [43.232951,0.078082], place.popularity = 228854;}
if (place.name=="Haute-Vienne") {place.geolocation = [45.833619,1.261105], place.popularity = 375869;}
if (place.name=="Haut-Rhin") {place.geolocation = [48.0793589,7.358512], place.popularity = 755202;}
if (place.name=="Hauts-de-Seine") {place.geolocation = [48.892423,2.215331], place.popularity = 1586434;}
if (place.name=="Hérault") {place.geolocation = [43.610769,3.876716], place.popularity = 1077627;}
if (place.name=="Ille-et-Vilaine") {place.geolocation = [48.117266,-1.6777926], place.popularity = 1007901;}
if (place.name=="Indre") {place.geolocation = [46.811434,1.686779], place.popularity = 228692;}
if (place.name=="Indre-et-Loire") {place.geolocation = [47.394144,0.68484], place.popularity = 596937;}
if (place.name=="Isère") {place.geolocation = [45.188529,5.724524], place.popularity = 1224993;}
if (place.name=="Jura") {place.geolocation = [46.671361,5.550796], place.popularity = 260932;}
if (place.name=="La Réunion") {place.geolocation = [48.936181,2.357443], place.popularity = 833944;}
if (place.name=="Landes") {place.geolocation = [43.893485,-0.499782], place.popularity = 392884;}
if (place.name=="Loire") {place.geolocation = [45.439695,4.3871779], place.popularity = 753763;}
if (place.name=="Loire-Atlantique") {place.geolocation = [47.218371,-1.553621], place.popularity = 1313321;}
if (place.name=="Loiret") {place.geolocation = [47.902964,1.909251], place.popularity = 662297;}
if (place.name=="Loir-et-Cher") {place.geolocation = [47.5860921,1.3359475], place.popularity = 331656;}
if (place.name=="Lot") {place.geolocation = [44.4475229,1.441989], place.popularity = 174346;}
if (place.name=="Lot-et-Garonne") {place.geolocation = [44.203142,0.616363], place.popularity = 332119;}
if (place.name=="Lozère") {place.geolocation = [44.517611,3.501873], place.popularity = 76889;}
if (place.name=="Maine-et-Loire") {place.geolocation = [47.478419,-0.563166], place.popularity = 795557;}
if (place.name=="Manche") {place.geolocation = [49.1154686,-1.0828136], place.popularity = 499340;}
if (place.name=="Marne") {place.geolocation = [48.956682,4.363073], place.popularity = 568750;}
if (place.name=="Martinique") {place.geolocation = [14.6160647,-61.0587804], place.popularity = 388364;}
if (place.name=="Mayenne") {place.geolocation = [48.0785146,-0.7669906], place.popularity = 307453;}
if (place.name=="Mayotte") {place.geolocation = [-12.7809488,45.227872], place.popularity = 21264511;}
if (place.name=="Meurthe-et-Moselle") {place.geolocation = [48.692054,6.184417], place.popularity = 733266;}
if (place.name=="Meuse") {place.geolocation = [48.773605,5.158238], place.popularity = 192800;}
if (place.name=="Morbihan") {place.geolocation = [47.658236,-2.760847], place.popularity = 732372;}
if (place.name=="Moselle") {place.geolocation = [49.1193089,6.1757156], place.popularity = 1046468;}
if (place.name=="Nièvre") {place.geolocation = [46.990896,3.162845], place.popularity = 216786;}
if (place.name=="Nord") {place.geolocation = [50.62925,3.057256], place.popularity = 2587128;}
if (place.name=="Oise") {place.geolocation = [49.4295387,2.0807123], place.popularity = 810300;}
if (place.name=="Orne") {place.geolocation = [48.432856,0.091266], place.popularity = 290015;}
if (place.name=="Paris") {place.geolocation = [48.856614,2.3522219], place.popularity = 2240621;}
if (place.name=="Pas-de-Calais") {place.geolocation = [50.291002,2.777535], place.popularity = 1463628;}
if (place.name=="Puy-de-Dôme") {place.geolocation = [45.777222,3.087025], place.popularity = 638092;}
if (place.name=="Pyrénées-Atlantiques") {place.geolocation = [43.2951,-0.370797], place.popularity = 660871;}
if (place.name=="Pyrénées-Orientales") {place.geolocation = [42.6886591,2.8948332], place.popularity = 457793;}
if (place.name=="Rhône") {place.geolocation = [45.764043,4.835659], place.popularity = 1762866;}
if (place.name=="Saône-et-Loire") {place.geolocation = [46.3068839,4.828731], place.popularity = 555039;}
if (place.name=="Sarthe") {place.geolocation = [48.00611,0.199556], place.popularity = 567382;}
if (place.name=="Savoie") {place.geolocation = [45.564601,5.917781], place.popularity = 421105;}
if (place.name=="Seine-et-Marne") {place.geolocation = [48.542105,2.6554], place.popularity = 1353946;}
if (place.name=="Seine-Maritime") {place.geolocation = [49.443232,1.099971], place.popularity = 1253931;}
if (place.name=="Seine-Saint-Denis") {place.geolocation = [48.908612,2.439712], place.popularity = 1538726;}
if (place.name=="Somme") {place.geolocation = [49.894067,2.295753], place.popularity = 571154;}
if (place.name=="Tarn") {place.geolocation = [43.9250853,2.1486413], place.popularity = 378947;}
if (place.name=="Tarn-et-Garonne") {place.geolocation = [44.0221252,1.3529599], place.popularity = 246971;}
if (place.name=="Territoire de Belfort") {place.geolocation = [47.639674,6.863849], place.popularity = 143940;}
if (place.name=="Val-de-Marne") {place.geolocation = [49.035617,2.060325], place.popularity = 1341831;}
if (place.name=="Val-d'Oise") {place.geolocation = [48.790367,2.455572], place.popularity = 1187081;}
if (place.name=="Var") {place.geolocation = [43.124228,5.928], place.popularity = 1021669;}
if (place.name=="Vaucluse") {place.geolocation = [43.949317,4.805528], place.popularity = 546314;}
if (place.name=="Vendée") {place.geolocation = [46.670511,-1.426442], place.popularity = 648901;}
if (place.name=="Vienne") {place.geolocation = [46.580224,0.340375], place.popularity = 430018;}
if (place.name=="Vosges") {place.geolocation = [48.172402,6.449403], place.popularity = 377282;}
if (place.name=="Yonne") {place.geolocation = [47.798202,3.573781], place.popularity = 341902;}
if (place.name=="Yvelines") {place.geolocation = [48.801408,2.130122], place.popularity = 1412356;}


    results.push(place); 
		
	}
	//console.log(JSON.stringify(results));
	fs.writeFile("data/places_france_departements.json", JSON.stringify(results), function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("The file data/places_france_departements.json was saved!");
	});
}


//agrege les données des différents référentiels de commune et enregistre au nouveau format json
function aggregateLocality () {
	
	var results= []; //résultats finaux de l'agregation des données
	
	// transforme les données de codes Insee-Code Postal
	// supprime les données inutiles
	// regroupe les codes posataux d'ue même ville
	var nbCodeInseeCodePostaux =codeInseeCodePostaux.length;

	console.log("traitement des codes postaux");
	var dataCodeInseeCodePostaux = [];
	for(var i = 0; i < nbCodeInseeCodePostaux; i++) {
	//for(var i = 0; i < 20; i++) {
		
		var tmpData = {};
		var codeInsee = codeInseeCodePostaux[i].fields.code_commune_insee;
		
		tmpData.code_postal=[codeInseeCodePostaux[i].fields.code_postal];
		tmpData.INSEE_COM=codeInseeCodePostaux[i].fields.INSEE_COM;
		tmpData.geo_shape=codeInseeCodePostaux[i].fields.geo_shape;
		if (tmpData.geo_shape) {
			//suppression des données inutiles dans le geoshape 
			delete tmpData.geo_shape.record_timestamp;
			delete tmpData.geo_shape.geometry;
			delete tmpData.geo_shape.nom_de_la_commune;
			delete tmpData.geo_shape.code_postal;
		}
		else {
				//@TODO : console.log("Sites DOM/TOM sans geolocalisation, geoshape:" + JSON.stringify(tmpData));
		}
		tmpData.geo_point_2d=codeInseeCodePostaux[i].fields.geo_point_2d;
		tmpData.code_commune_insee=codeInseeCodePostaux[i].fields.code_commune_insee;
		
		
		
		//il existe des doublons de codeInsee lorsque la localité a plusieurs codePostaux 
		// cela arrive : voir en ligne https://public.opendatasoft.com/explore/dataset/code-insee-postaux-geoflar/?tab=table&q=98729
		// lorsque les communes fusionnent ex: 76108
		// lorque l'on est dans les dom/tom, dans ce cas il y a un libelle d'acheminement différent : ex 98729, note dans ce cas il peut y avoir ou pas un CodePostal différent
		// dans les grandes villes qui ont plusieurs code postaux : ex nice:06088
		// dans les villes à arrondissements : paris, lyon ex code_insee : 75116
		// dans certaines villes comme lille qui ont des communes associées
		
		
		//si un enregistrement existe, les codes postaux sont cumulés
		//@TODO : dans les dom/TOM ce n'est pas un fonctionnement optimal
		if (dataCodeInseeCodePostaux[codeInsee]) {	
			dataCodeInseeCodePostaux[codeInsee].code_postal.push(codeInseeCodePostaux[i].fields.code_postal);
			tmpData.code_postal = dataCodeInseeCodePostaux[codeInsee].code_postal;
		}
		else {								
			tmpData.code_postal =[codeInseeCodePostaux[i].fields.code_postal];
		}
		
		//cas de lille, présence de "sous ville"/commune assosciées avec des code postaux spécifiques
		//@TODO : ajouter les entrées euralille, lomme hellemes lille, dans le cas ci-dessous les données de complement ne sont pas ajoutée
		//EURALILLE code postal : 59777 code insee 59350
		//LOMME LOMME code postal :59160
		//HELLEMMES LILLE code_postal 59260
		if (codeInseeCodePostaux[i].fields.nom_de_la_commune=="LILLE" ){	
			tmpData.district=codeInseeCodePostaux[i].fields.nom_de_la_commune;
		}
		
		 // Dans le cas quartiers : Paris, Lyon, Marseille : un enregistrement par quartier + inversion acheminement et commune
		 if (codeInseeCodePostaux[i].fields.libelle_d_acheminement == "LYON" || codeInseeCodePostaux[i].fields.libelle_d_acheminement == "PARIS" || codeInseeCodePostaux[i].fields.libelle_d_acheminement == "MARSEILLE") {
				//console.log("****************************************************" + "MEGAPOLE")	
				//@TODO : ajouter des entrées globales PARIS, MARSEILLE, LYON
				tmpData.district=codeInseeCodePostaux[i].fields.nom_de_la_commune;
				tmpData.nom_de_la_commune=codeInseeCodePostaux[i].fields.libelle_d_acheminement;
		}
				
		// si libelle d'acheminement= nom commune : fusion du code Postal dans un tableau unique (ex 76108, 06088)
		if (codeInseeCodePostaux[i].fields.libelle_d_acheminement == codeInseeCodePostaux[i].fields.nom_de_la_commune) {	
				//console.log("****************************************************" + "cas3")
				tmpData.nom_de_la_commune =codeInseeCodePostaux[i].fields.nom_de_la_commune;
		}
		
		// dans le cas de paris, fusion de 75116 et 75016
		if (codeInsee=="75116") {	
				//console.log("****************************************************" + "75116")
				tmpData.district=codeInseeCodePostaux[i].fields.nom_de_la_commune;
				tmpData.nom_de_la_commune=codeInseeCodePostaux[i].fields.libelle_d_acheminement;
		}
		
		// si libelle d'acheminement != nom commune pour DOM-TOM : cela fait n'importe quoi
		//@TODO : faire mieux pour les dom-tom
		// 98000 : monaco
		if (codeInseeCodePostaux[i].fields.code_postal > 97000 && codeInseeCodePostaux[i].fields.code_postal != 98000){	
				tmpData.district=codeInseeCodePostaux[i].fields.libelle_d_acheminement;
				tmpData.nom_de_la_commune=codeInseeCodePostaux[i].fields.nom_de_la_commune;
				//console.log("****************************************************" + "DOM/TOM")
		}
		
		//cas des villes hors DOM/TM qui ont un libelle d'achemineent diférent de la commune
		// 22153 MONCONTOUR DE BRETAGNE vs MONCONTOUR
		// Choix:  on applique le libelle d'acheminement généralement plus complet comme nom de la localité
		if (!tmpData.nom_de_la_commune && !tmpData.district){	
			tmpData.nom_de_la_commune = codeInseeCodePostaux[i].fields.libelle_d_acheminement;
		}
	
		dataCodeInseeCodePostaux[codeInsee] = tmpData;
	}
	






	// on parcourt les données pour mettre les départments/régions et les nom de ville en minuscule
	console.log("Ajout des départements, régions et villes en minuscules");

	
	// voir https://public.opendatasoft.com/explore/dataset/resume-statistique-communes-departements-et-regions-france-2012-2013-2014/?tab=metas
	var data = resumeStatistiquesDepartementRegionfrance;
	var nbResumeStatistiquesDepartementRegionfrance = resumeStatistiquesDepartementRegionfrance.length;
	
	for(var i = 0; i < nbResumeStatistiquesDepartementRegionfrance; i++) {

		var codeInseeTmp = data[i].fields.codgeo;
	
		//filtre les communes qui ont disparues (fusionnées avec d'autres communes, ex Melay, magny les vosges
		if (dataCodeInseeCodePostaux[codeInseeTmp]) {
			
			//on marque les enregistrements qui ont été traitées
			dataCodeInseeCodePostaux[codeInseeTmp].treated=true;
			
			//console.log(JSON.stringify(dataCodeInseeCodePostaux[data[i].fields.codgeo].code_postal));
	  	var result = {};
	  	result.uid=codeInseeTmp;//@TODO : utiliser un autre identifiant
	  	result.codeInsee=codeInseeTmp;//à supprimer par la suite
	  	
			
			result.name=data[i].fields.libelle_commune_ou_arm;//TODO changer par tableau
	  	result.type="places";  
	  	//sub_type: permet de préciser le type de places locality | region | departement | quarter | locality_community(????)
			//voir https://developers.google.com/places/supported_types + champs personels
			result.sub_type="locality";  
	  	
	  	result.postal_code=dataCodeInseeCodePostaux[codeInseeTmp].code_postal;
	  	result.locality=data[i].fields.libelle_commune_ou_arm;//transformer st ste en saint sainte
	  	result.district=dataCodeInseeCodePostaux[codeInseeTmp].district || "";
	  	if (dataCodeInseeCodePostaux[codeInseeTmp].district) {
			  		result.district=dataCodeInseeCodePostaux[codeInseeTmp].district.charAt(0).toUpperCase() + dataCodeInseeCodePostaux[codeInseeTmp].district.slice(1).toLowerCase();
			  	}
			  	else {
			  		result.district ="";
			  	}
			result.departement=departements[data[i].fields.departement].departement;
			result.region=departements[data[i].fields.departement].region;
			result.state="";
			result.country="FR";
	  	result.geolocation=dataCodeInseeCodePostaux[codeInseeTmp].geo_point_2d;
			result.geoshape=dataCodeInseeCodePostaux[codeInseeTmp].geo_shape;
			result.popularity=data[i].fields.population_en_2012;
			
			result.slug="";
			results.push(result);
			//console.log(result );
			
			
		}
		else{
			//PARIS, LYON MARSEILLE, ANCIENNES COMMUNES
			//paris, lyon et anciennes communes seront traitées dans la suite du code, les anciennes communes ne sont pas conservées
			//console.log("erreur donnée manquante" + JSON.stringify(data[i].fields) + '-' +JSON.stringify(data[i].fields.nom_de_la_commune) + '-' +JSON.stringify(data[i].fields.district));
			//console.log("");
		}
	}    
	
	
	//les données qui n'ont pas été traités (présente dans le ref des code postax mais dans les données de statistique département) sont traitées à part
	for (var tmpData in dataCodeInseeCodePostaux) {
		if (!dataCodeInseeCodePostaux[tmpData].treated) {
				var myelse=false;
				
					dataCodeInseeCodePostaux[tmpData].codeInsee=tmpData;
					//cas de paris, marseille, lyon arrondissements
					if (dataCodeInseeCodePostaux[tmpData].nom_de_la_commune =="PARIS" ) {
						dataCodeInseeCodePostaux[tmpData].departement="Paris";
						dataCodeInseeCodePostaux[tmpData].region="Ile-de-France";
						dataCodeInseeCodePostaux[tmpData].locality ="Paris";
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75001") {	dataCodeInseeCodePostaux[tmpData].popularity=17100;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75002") {	dataCodeInseeCodePostaux[tmpData].popularity=22390;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75003") {	dataCodeInseeCodePostaux[tmpData].popularity=35991;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75004") {	dataCodeInseeCodePostaux[tmpData].popularity=27769;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75005") {	dataCodeInseeCodePostaux[tmpData].popularity=60179;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75006") {	dataCodeInseeCodePostaux[tmpData].popularity=43224;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75007") {	dataCodeInseeCodePostaux[tmpData].popularity=57092;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75008") {	dataCodeInseeCodePostaux[tmpData].popularity=38749;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75009") {	dataCodeInseeCodePostaux[tmpData].popularity=59474;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75010") {	dataCodeInseeCodePostaux[tmpData].popularity=94474;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75011") {	dataCodeInseeCodePostaux[tmpData].popularity=155006;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75012") {	dataCodeInseeCodePostaux[tmpData].popularity=144925;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75013") {	dataCodeInseeCodePostaux[tmpData].popularity=182386;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75014") {	dataCodeInseeCodePostaux[tmpData].popularity=141102;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75015") {	dataCodeInseeCodePostaux[tmpData].popularity=238190;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75016") {	dataCodeInseeCodePostaux[tmpData].popularity=167613;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75017") {	dataCodeInseeCodePostaux[tmpData].popularity=170156	;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75018") {	dataCodeInseeCodePostaux[tmpData].popularity=201374;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75019") {	dataCodeInseeCodePostaux[tmpData].popularity=186116	;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "75020") {	dataCodeInseeCodePostaux[tmpData].popularity=197311;}
					}
					else if (dataCodeInseeCodePostaux[tmpData].nom_de_la_commune =="LYON" ) {
						dataCodeInseeCodePostaux[tmpData].departement="Rhône";
						dataCodeInseeCodePostaux[tmpData].region="Rhône-Alpes";
						dataCodeInseeCodePostaux[tmpData].locality ="Lyon";
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "69001") {	dataCodeInseeCodePostaux[tmpData].popularity=29209;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "69002") {	dataCodeInseeCodePostaux[tmpData].popularity=30958;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "69003") {	dataCodeInseeCodePostaux[tmpData].popularity=98135;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "69004") {	dataCodeInseeCodePostaux[tmpData].popularity=36240;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "69005") {	dataCodeInseeCodePostaux[tmpData].popularity=46693;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "69006") {	dataCodeInseeCodePostaux[tmpData].popularity=49479;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "69007") {	dataCodeInseeCodePostaux[tmpData].popularity=75746;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "69008") {	dataCodeInseeCodePostaux[tmpData].popularity=81454;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "69009") {	dataCodeInseeCodePostaux[tmpData].popularity=48429;}
					}
					
					//@TODO : ajouter les quartiers de marseille dans d'autres places
					else if (dataCodeInseeCodePostaux[tmpData].nom_de_la_commune =="MARSEILLE" ) {
						dataCodeInseeCodePostaux[tmpData].departement="Bouches-du-Rhône";
						dataCodeInseeCodePostaux[tmpData].region="Provence-Alpes-Côte d'Azur";
						dataCodeInseeCodePostaux[tmpData].locality ="Marseille";
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13001") {	dataCodeInseeCodePostaux[tmpData].popularity=40919;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13002") {	dataCodeInseeCodePostaux[tmpData].popularity=25779;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13003") {	dataCodeInseeCodePostaux[tmpData].popularity=45414;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13004") {	dataCodeInseeCodePostaux[tmpData].popularity=47193;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13005") {	dataCodeInseeCodePostaux[tmpData].popularity=44583;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13006") {	dataCodeInseeCodePostaux[tmpData].popularity=43360;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13007") {	dataCodeInseeCodePostaux[tmpData].popularity=40919;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13008") {	dataCodeInseeCodePostaux[tmpData].popularity=78837;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13009") {	dataCodeInseeCodePostaux[tmpData].popularity=76868;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13010") {	dataCodeInseeCodePostaux[tmpData].popularity=51299;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13011") {	dataCodeInseeCodePostaux[tmpData].popularity=56792;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13012") {	dataCodeInseeCodePostaux[tmpData].popularity=58734;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13013") {	dataCodeInseeCodePostaux[tmpData].popularity=89316;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13014") {	dataCodeInseeCodePostaux[tmpData].popularity=61920;}
						if (dataCodeInseeCodePostaux[tmpData].code_postal == "13015") {	dataCodeInseeCodePostaux[tmpData].popularity=77770;}
					}
					else {
						
						//DOM/TOM

						dataCodeInseeCodePostaux[tmpData].locality= dataCodeInseeCodePostaux[tmpData].nom_de_la_commune.charAt(0).toUpperCase() + dataCodeInseeCodePostaux[tmpData].nom_de_la_commune.slice(1).toLowerCase();
	
					  if (dataCodeInseeCodePostaux[tmpData].district) {
					  	dataCodeInseeCodePostaux[tmpData].district= dataCodeInseeCodePostaux[tmpData].district.charAt(0).toUpperCase() + dataCodeInseeCodePostaux[tmpData].district.slice(1).toLowerCase();
							
						}
						if (dataCodeInseeCodePostaux[tmpData].locality == dataCodeInseeCodePostaux[tmpData].district) {
							dataCodeInseeCodePostaux[tmpData].district="";
						}
					}
					
			  	var result = {};
			  	result.uid=tmpData;//@TODO : utiliser un autre identifiant unique
			  	result.codeInsee=dataCodeInseeCodePostaux[tmpData].codeInsee;
					
					result.name=dataCodeInseeCodePostaux[tmpData].nom_de_la_commune.charAt(0).toUpperCase() + dataCodeInseeCodePostaux[tmpData].nom_de_la_commune.slice(1).toLowerCase();
			  	result.type="places";  
			  	//sub_type: permet de préciser le type de places locality | region | departement | quarter | locality_community(????)
					//voir https://developers.google.com/places/supported_types + champs personels
					result.sub_type="locality";  
			  	
			  	result.postal_code=dataCodeInseeCodePostaux[tmpData].code_postal;
			  	result.locality=dataCodeInseeCodePostaux[tmpData].locality;
			  	if (dataCodeInseeCodePostaux[tmpData].district) {
			  		result.district=dataCodeInseeCodePostaux[tmpData].district.charAt(0).toUpperCase() + dataCodeInseeCodePostaux[tmpData].district.slice(1).toLowerCase();
			  	}
			  	else {
			  		result.district ="";
			  	}
					result.departement=dataCodeInseeCodePostaux[tmpData].departement;
					result.region=dataCodeInseeCodePostaux[tmpData].region;
					result.state="";
					result.country=dataCodeInseeCodePostaux[tmpData].country;
			  	result.geolocation=dataCodeInseeCodePostaux[tmpData].geo_point_2d;
					result.geoshape=dataCodeInseeCodePostaux[tmpData].geo_shape;
					result.popularity=dataCodeInseeCodePostaux[tmpData].popularity;
					
					// dans le cas des dom/tom, il faut avoir une autre règle de saisie des départements/régions
					if (!result.departement || tmpData.substr(0,3)>=971){
						result.departement=departements[tmpData.substr(0,3)].departement;
						result.region=departements[tmpData.substr(0,3)].region;
						result.country=departements[tmpData.substr(0,3)].country;
					}
					
					result.slug="";
					results.push(result);
					
					
		}	
		
	}
	
	
	
	//ajout des exeptions
	
	var lillehellemes = { uid: '59350-2',
		codeInsee: '59350-2',
    name: 'Hellemmes',
    type: 'places',
    sub_type: 'locality',
    postal_code: [ '59260'],
    locality: 'Hellemmes',
    district: '',
    departement: 'Nord',
    region: 'Nord-Pas-de-Calais',
    state: '',
    country: 'FR',
    geolocation: [ 50.631718316778176, 3.0478327231208246],
    geoshape: { type: 'Polygon', coordinates: [[[3.054628580301429, 50.60077361700828], [3.049044478564805, 50.600802874194365], [3.042392952717893, 50.60591191249631], [3.037146248837461, 50.60527639466105], [3.028814026530338, 50.609487704406725], [3.021231539335455, 50.62214328530457], [3.013120719646876, 50.62558160226801], [2.994074157915726, 50.62859753775308], [2.981656069385164, 50.634178337882645], [2.971736534828665, 50.63364699434052], [2.970015035131062, 50.633664539052525], [2.970392581486746, 50.63949787955862], [2.974383383927446, 50.64528709592047], [2.969294999053914, 50.65739191489277], [2.970720426800011, 50.65810120106095], [2.983693340250039, 50.66122650679796], [3.002738469896423, 50.65235229890965], [3.028617656105381, 50.63615072975644], [3.045816061642774, 50.648072230839595], [3.05959546438902, 50.65104577111715], [3.075393906044724, 50.64380406908427], [3.083536132257642, 50.651552470657144], [3.085531308058785, 50.6544138242905], [3.093572015251902, 50.6513837825942], [3.103158310903011, 50.6522735940261], [3.094271449283918, 50.640488681423165], [3.106663905626271, 50.63463643418357], [3.116813850210803, 50.636458047238364], [3.121199162962043, 50.63508078358856], [3.124872608042597, 50.61990149796138], [3.120538409052407, 50.61846986751563], [3.096879577003554, 50.617153391371254], [3.081063488374251, 50.61509161869285], [3.071459775199341, 50.606607573313575], [3.06459710972006, 50.610874271145256], [3.054628580301429, 50.60077361700828]]] },
    popularity: 17601,
    slug: '' };
  results.push(lillehellemes);
  
  
  var euralille = { uid: '59777-2',
  	codeInsee: '59777-2',
    name: 'Euralille',
    type: 'places',
    sub_type: 'locality',
    postal_code: [ '59777'],
    locality: 'Euralille',
    district: '',
    departement: 'Nord',
    region: 'Nord-Pas-de-Calais',
    state: '',
    country: 'FR',
    geolocation: [ 50.631718316778176, 3.0478327231208246],
    geoshape: { type: 'Polygon', coordinates: [[[3.054628580301429, 50.60077361700828], [3.049044478564805, 50.600802874194365], [3.042392952717893, 50.60591191249631], [3.037146248837461, 50.60527639466105], [3.028814026530338, 50.609487704406725], [3.021231539335455, 50.62214328530457], [3.013120719646876, 50.62558160226801], [2.994074157915726, 50.62859753775308], [2.981656069385164, 50.634178337882645], [2.971736534828665, 50.63364699434052], [2.970015035131062, 50.633664539052525], [2.970392581486746, 50.63949787955862], [2.974383383927446, 50.64528709592047], [2.969294999053914, 50.65739191489277], [2.970720426800011, 50.65810120106095], [2.983693340250039, 50.66122650679796], [3.002738469896423, 50.65235229890965], [3.028617656105381, 50.63615072975644], [3.045816061642774, 50.648072230839595], [3.05959546438902, 50.65104577111715], [3.075393906044724, 50.64380406908427], [3.083536132257642, 50.651552470657144], [3.085531308058785, 50.6544138242905], [3.093572015251902, 50.6513837825942], [3.103158310903011, 50.6522735940261], [3.094271449283918, 50.640488681423165], [3.106663905626271, 50.63463643418357], [3.116813850210803, 50.636458047238364], [3.121199162962043, 50.63508078358856], [3.124872608042597, 50.61990149796138], [3.120538409052407, 50.61846986751563], [3.096879577003554, 50.617153391371254], [3.081063488374251, 50.61509161869285], [3.071459775199341, 50.606607573313575], [3.06459710972006, 50.610874271145256], [3.054628580301429, 50.60077361700828]]] },
    popularity: 4000,
    slug: '' };  
  results.push(euralille);
  
  
  var paris = { uid: '75056',
  	codeInsee: '75056',
    name: 'Paris',
    type: 'places',
    sub_type: 'locality',
    postal_code: [ '75000'],
    locality: 'Paris',
    district: '',
    departement: 'Paris',
    region: 'Ile-de-France',
    state: '',
    country: 'FR',
    geolocation: [ 48.8564961,2.3522244],
    geoshape: { type: 'Polygon', coordinates: [[[2.416367,48.849247],[2.415892,48.846637],[2.416502,48.834705],[2.422967,48.842714],[2.427461,48.841639],[2.437059,48.841171],[2.442857,48.845551],[2.447579,48.844899],[2.464673,48.841532],[2.467314,48.839125],[2.46962,48.836077],[2.464996,48.829986],[2.466188,48.826672],[2.461194,48.818277],[2.456645,48.817006],[2.419933,48.82393],[2.403242,48.829163],[2.393998,48.827569],[2.389917,48.825921],[2.368823,48.817555],[2.364442,48.816084],[2.360036,48.815611],[2.355593,48.815866],[2.352648,48.818314],[2.344084,48.815956],[2.332032,48.816942],[2.328164,48.819069],[2.313783,48.822109],[2.309534,48.823082],[2.301049,48.825075],[2.297141,48.825987],[2.289538,48.828182],[2.285347,48.829803],[2.271895,48.828363],[2.263029,48.834011],[2.262759,48.83383],[2.257612,48.834607],[2.248056,48.84632],[2.223956,48.853218],[2.225787,48.859336],[2.230058,48.867314],[2.23278,48.869508],[2.236482,48.870854],[2.245659,48.876353],[2.255282,48.874641],[2.260275,48.880221],[2.280002,48.878534],[2.280497,48.881181],[2.284306,48.885772],[2.299983,48.892268],[2.303792,48.894053],[2.315925,48.898665],[2.31983,48.900414],[2.324885,48.900874],[2.329983,48.901163],[2.334361,48.901233],[2.351873,48.901527],[2.361188,48.901613],[2.365854,48.90161],[2.370286,48.901652],[2.389444,48.901193],[2.397957,48.892864],[2.398651,48.889414],[2.400339,48.883748],[2.407535,48.880528],[2.410694,48.878475],[2.413277,48.873119],[2.414556,48.858817],[2.415427,48.855268],[2.416367,48.849247]]] },
    popularity: 4000,
    slug: '' };  
   results.push(paris);
    
   var lyon = { uid: '69123',
   	codeInsee: '69123',
    name: 'Lyon',
    type: 'places',
    sub_type: 'locality',
    postal_code: [ '69000'],
    locality: 'Lyon',
    district: '',
    departement: 'Rhône-Alpes',
    region: 'Rhône',
    state: '',
    country: 'FR',
    geolocation: [ 45.7699284396584,4.829224649781766],
    geoshape: { type: 'Polygon', coordinates: [[[4.830490136783295,45.764711873086085],[4.828234329945935,45.767324545508124],[4.819695911085194,45.767156356147254],[4.812869224911417,45.771301526436304],[4.835619846255646,45.77462664189978],[4.839738601584955,45.77307334284989],[4.839756688763879,45.766272510421146],[4.830490136783295,45.764711873086085]]] },
    popularity: 496343,
    slug: '' };
  results.push(lyon); 
    
  var marseille = { uid: '13055',
  	codeInsee: '13055',
    name: 'Marseille',
    type: 'places',
    sub_type: 'locality',
    postal_code: [ '13000'],
    locality: 'Marseille',
    district: '',
    departement: 'Bouches-du-Rhône',
    region: 'Provence-Alpes-Côte d\'Azur',
    state: '',
    country: 'FR',
    geolocation: [ 43.29990094363675,5.382278697952184],
    geoshape: { type: 'Polygon', coordinates: [[[5.372144736531373,43.290965444448595],[5.371008366340329,43.29359128652747],[5.373616424523343,43.29499198426251],[5.375021899598046,43.30159390045778],[5.390502166127308,43.30939746657357],[5.393048242612156,43.3042292209066],[5.389078069139432,43.300312137417784],[5.385563774200395,43.29429693114428],[5.381847823036012,43.295908846993086],[5.380357790047036,43.29294477171],[5.372144736531373,43.290965444448595]]] },
    popularity: 852516,
    slug: '' };  
    
    results.push(marseille); 
   
   
  //suppression de données et mise à jour region, departements pour certains dom
	for (var tmpData in results) {
		//console.log(JSON.stringify(results[tmpData]));
		var tmpCodeInsee = results[tmpData].codeInsee;
		var tmpCodeInseeShort = tmpCodeInsee.substr(0,3);
		if (tmpCodeInseeShort==971 || tmpCodeInseeShort==972 || tmpCodeInseeShort==973 || tmpCodeInseeShort==974 || tmpCodeInseeShort==975 || tmpCodeInseeShort==976 ) {
			results[tmpData].departement=departements[tmpCodeInseeShort].departement;
			results[tmpData].region=departements[tmpCodeInseeShort].region;
			results[tmpData].country=departements[tmpCodeInseeShort].country;
			results[tmpData].district="";
		}
		if (tmpCodeInsee==97701 || tmpCodeInsee==97502 || tmpCodeInsee==97801  ) {
			results[tmpData].name=results[tmpData].departement;
			results[tmpData].locality=results[tmpData].departement;
		}

	
		//slug : comme tripadvisor ou google 
		//http://www.tripadvisor.fr/Attractions-g670763-Activities-Saint_Cloud_Hauts_de_Seine_Ile_de_France.html
		//	g187147-d188149-Reviews-Musee_Rodin-Paris_Ile_de_France
	  //	gabe234-lac45f2-Events-Saint_cloud-Paris-Ile_de_France
		
		var base10l = baseConverter.hexToDec(md5(results[tmpData].country + results[tmpData].state +results[tmpData].region+results[tmpData].departement+results[tmpData].district +results[tmpData].locality).substr(0,7)).toString().replace('.', '').substr(0,10);
		
		results[tmpData].slug= 'l'+base10l + '-' + results[tmpData].name.replace(' ', '+')
		.replace('é', 'e')
		.replace('è', 'e')
		.replace('ê', 'e')
		.replace('ë', 'e')
		.replace('ï', 'i')
		.replace('î', 'i')
		.replace('û', 'u')
		.replace('ù', 'u')
		.replace('ü', 'u')
		.replace('ö', 'o')
		.replace('ô', 'o')
		.replace('à', 'a')
		.replace('Î', 'I')
		.replace('É', 'E')
		.replace('È', 'E')
		.replace('ç', 'c')
		;
		results[tmpData].source ="www.etalab.gouv.fr"
	
		delete results[tmpData].codeInsee;
	} 
    
    
  fs.writeFile("data/places_france_locality.json", JSON.stringify(results), function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("The file data/places_france_locality.json was saved!");
	}); 
				
	
	//console.log(results);
	//TODO 
	// st dans les dom tom // OK done
	// tiret entre les mots dans sles dom/tom
	// ajouter lille autres // OK done excepté geoshape
	// ajouter quartier marseillle
	// ajouter geoloc, geshape dom // OK done excepté geoshape
	// enlever district à lille // OK done excepté geoshape
	// ajouter global paris, marseille, lyon : paris présent dans 2eme fichier mais codegeo 75056 (sans geoshape, marseille 13055, lyon "69123", // OK done excepté geoshape
	// ajouter des + dans les slugs (La Ferté-Saint-Cyr) // OK done excepté geoshape
	// transformer st en saint ste en sainte //done
	
	//parcourir 1 et conserver population 2012, commune minuscule
	//pour chaque 1
	//récupérer de 2 code postal geoshape, geopoint 
	//récuper de 3 la région minuscule
	//récuper de 4 le département mnuscule
	//enregistrer les datas au format

	//uid : basé sur le slug
	//name : commune contenant des minuscules et des espaces
	//slug : comme tripadvisor ou google 
		//http://www.tripadvisor.fr/Attractions-g670763-Activities-Saint_Cloud_Hauts_de_Seine_Ile_de_France.html
		//	g187147-d188149-Reviews-Musee_Rodin-Paris_Ile_de_France
	  //	gabe234-lac45f2-Events-Saint_cloud-Paris-Ile_de_France
	//postal_code : Array of code postal
	//locality : commune
	//district : 
	//departement : département
	//region : région
	//state : 
	//country : "FR"
	//geolocation : geolocation
	//geoshape : geojson shape
	//source : www.etalab.gouv.fr
	//popularity: population
	//type : places
	//sub_type: permet de préciser le type de places locality | region | departement | (????)
		//voir https://developers.google.com/places/supported_types + champs personels
		
}


async.parallel([
  function(callback) {
    retrieveDepartements(callback);
  },
  function(callback) {
    retrieveStatistiquesDepartementRegionfrance(callback);
  },
  function(callback) {
    retrieveCodeInseeCodePostaux(callback);
  },
  function(callback) {
    retrieveDepartementsGeoJson(callback);
  },
  function(callback) {
    retrieveRegionsGeoJson(callback);
  }
], function(error, results) {
  if (error) {
  	console.log("Error while retrieving data");	
  }
  else{
  	aggregateLocality();
  	aggregateRegions();
  	aggregateDepartements();
  	//@TODO : ajouter geoloc aux dépatements
  	//@TODO : ajouter des liens hiérarchiques
  }
});







