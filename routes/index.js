// Full Documentation - https://www.turbo360.co/docs
const turbo = require('turbo360')({site_id: process.env.TURBO_APP_ID})
const vertex = require('vertex360')({site_id: process.env.TURBO_APP_ID})
const router = vertex.router()
const config = {
	missingImage: "https://lh3.googleusercontent.com/FGdEZRVyswV8mg7aBSrw4T_9r-u3Slls56ndAHIfSz9Dj1tMmph-viIZ1FSsCkge0NxC8XXOZ9G3PbzKi2piJJWM3w"
}

const adminAccess = req => {
	return new Promise((resolve, reject)=>{
	// session not defined, user not logged in
	if (req.vertexSession == null){
		resolve(false);
	}
	//user key in session not defined, user not logged in
	if (req.vertexSession.user == null){
		resolve(false);
	}
		turbo
		.fetchUser(req.vertexSession.user.id)
		.then(data=>{
			resolve(data.accountType === "admin");
		})
		.catch(err =>{
			resolve(false);
		});
	});
};

/*  This is the home route. It renders the index.mustache page from the views directory.
	Data is rendered using the Mustache templating engine. For more
	information, view here: https://mustache.github.io/#demo */
router.get('/', (req, res) => {
	turbo.fetch("building", null).then(buildings => {
		res.render("index", { data: buildings });
	});
});

router.get("/login", function(req, res){
	res.render("login");
})

router.post("/login", function(req, res){
	turbo
	.login(req.body)
	  .then(data=>{
		  console.log("login response : " + data);
		  req.vertexSession.user = { id: data.id };
	  adminAccess(req)
	  .then(access=>{
		  if(access){
			  res.render("admin");
		  }else{
			  res.redirect("/");
		  }
	  })
	  .catch(err=>{
		  res.redirect("/");
	  });
	})
	  .catch(err => {
	  console.log(err);
		  res.redirect("/error");
	  })
  });

router.get("/admin", function(req, res){
	adminAccess(req)
	.then(access=>{
		if(access){
			res.render("admin");
		}else{
			res.redirect("/");
		}
	})
	.catch(err=>{
		res.redirect("/");
	});
});

router.get("/error", function(req, res){
	res.redirect("/");
});

router.post("/user", function(req, res){
	turbo
	.createUser(req.body)
	.then(data=>{
		res.redirect("/admin");
	})
	.catch(err=>{
		console.log(err);
	})
})

router.get('/:buildingSlug', function(req, res){
	let building = {};
	turbo
		.fetch("building", { 
			slug: req.params.buildingSlug
		})
		.then(buildings => {
			building = buildings[0];
			return turbo.fetch("apartment", {
				building: buildings[0].id
			})
		})
		.then(apartments => {
			apartments.forEach((apt, i) => {
				turbo.fetch("userImage", { apartmentId: apt.id })
				.then((data) => {
					apartments[i].remoteImages = data;
					if (apartments.length - 1 === i) {
						building.apartments = apartments;
						adminAccess(req)
						.then(access=>{
							if(access){
								res.render("building", building);
							}
							res.render("buildingAd", building);
						})
						.catch((err)=>{
							res.render("buildingAd", building);
						})
					}
			});
		});
	})
	.catch(err => {
		console.log(err);
		return;
	})
})

router.post("/:buildingSlug", function(req, res){
	let params = req.body

	if (params.mainImage){
		params.mainImage = config.missingImage;
	}
	turbo
		.fetch("building", { slug: req.params.buildingSlug })
		.then(buildings => {
			params.building = buildings[0].id
			return turbo.create('apartment', params)
		})
		.then((apartment) => {
			console.log(apartment);
			res.redirect("/" + req.params.buildingSlug);
		})
		.catch((err) => {
			console.log(err);
			return ;
		});
})

router.post('/apartment/:id', function(req, res) {
	let id = req.params.id
	let newApartment = req.body;

	if (newApartment.mainImage){
		newApartment.mainImage = config.missingImage;
	}
	turbo
		.updateEntity("apartment", id, newApartment)
		.then((data)=>{
			res.redirect("/");
		})
		.catch((err)=>{
			res.redirect("/");
		});
	return;
})



/*  This route render json data */
router.get('/json', (req, res) => {
	res.json({
		confirmation: 'success',
		app: process.env.TURBO_APP_ID,
		data: 'this is a sample json route.'
	})
})

/*  This route sends text back as plain text. */
router.get('/send', (req, res) => {
	res.send('This is the Send Route')
})

/*  This route redirects requests to Turbo360. */
router.get('/redirect', (req, res) => {
	res.redirect('https://www.turbo360.co/landing')
})


module.exports = router
