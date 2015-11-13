# yogoout-generate-places

R�cup�ration de donn�es d'etalab (localit�, d�partement, r�gion) et remise � plat des formats pour avoir des donn�es format�es

## Utilisation 
    git clone

    cd yogoout-aggregate-places

    npm install

    npm start
    
Les fichiers g�n�r�es sont sous data/

## Format de sortie des fichiers
	//uid : identifiant unique de la "place" (bas� sur le slug)
	//name : nom de la place (localit�, d�partement, r�gion) contenant des minuscules et des espaces
	//slug : nom compatible avec des urls comme tripadvisor ou google 
		//http://www.tripadvisor.fr/Attractions-g670763-Activities-Saint_Cloud_Hauts_de_Seine_Ile_de_France.html
		//	g187147-d188149-Reviews-Musee_Rodin-Paris_Ile_de_France
	  //	gabe234-lac45f2-Events-Saint_cloud-Paris-Ile_de_France
	//postal_code : Array de code postaux si commune
	//locality : localit�
	//district : 
	//departement : d�partement
	//region : r�gion
	//state : �tat (non applicable en france)
	//country : code Pays, les DOM/TOM ont leur prore code pays
	//geolocation : geolocation au format [lat, long]
	//geoshape : geojson shape de la place
	//source : source des donn�es : www.etalab.gouv.fr
	//popularity: population du lieu
	//type : places
	//sub_type: permet de pr�ciser le type de places locality | region | departement | (????)
		//voir https://developers.google.com/places/supported_types + champs personels
