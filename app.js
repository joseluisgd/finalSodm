var express = require('express');
var bodyParser = require('body-parser');
var admin = require('firebase-admin');
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport('smtps://servicioulimarket@gmail.com:ulimarket2016@smtp.gmail.com');
const Mailgen = require('mailgen');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Autorizacion del node hacia el Firebase
admin.initializeApp({
    credential: admin.credential.cert("./schema-ulimarket.json"),
    databaseURL: "https://schema-ulimarket.firebaseio.com"
});

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


// Get a database reference to our posts
var db = admin.database();

//Validacion del Login
function userExist(body, callback) {
    var ref = db.ref('users/' + body.user);
    ref.once("value").then(function(snapshot) {
        if (snapshot.val() == null) {
            callback(0);
        } else {
            callback(1);
        }
    });
};

//verificar si el correo le pertenece a esa persona
function correoEsDeEsaPersona(body, callback) {
    var ref = db.ref('users/' + body.user + '/email');
    ref.once("value").then(function(snapshot) {
        console.log(snapshot.val());
        console.log(body.email);
        if (snapshot.val() == body.email) {
            callback(0);
        } else {
            callback(1);
        }
    });
};

//contraseña random
function rand_code(chars, lon, callback) {
    code = "";
    for (x = 0; x < lon; x++) {
        rand = Math.floor(Math.random() * chars.length);
        code += chars.substr(rand, 1);
    }
    callback(code);
}

//Funcion: Login ---> Utiliza la funcion userExist
function login(body, callback) {
    var ref = db.ref('users/' + body.user);
    ref.once("value").then(function(snapshot) {
        if (body.pwd == snapshot.child("pwd").val()) {
            callback(snapshot);
        } else {
            callback(0);
        };
    });
};

//Verifica si existe el snapshot.key = availability
function availability(body, callback) {
    var ref = db.ref('users/' + body.user + '/availability');
    ref.once('value').then(function(snapshot) {
        if (snapshot.val() == null) {
            callback(0);
        } else {
            callback(1);
        };
    });
};
//Verifica si existe el snapshot.key = sales
function sales(callback) {
    var ref = db.ref('sales');
    ref.once('value').then(function(snapshot) {
        if (snapshot.val() == null) {
            callback(0);
        } else {
            callback(1);
        }
    });
}


//Funcion createProduct: Verificacion si tiene algun producto y registro del producto
//Llamara a la funcion para gettear el ID del Producto   (idProduct)
/*     ----- PUEDE SERVIR -----
function createProduct(body, callback) {
    var ref = db.ref('users/' + body.user + '/products');
    ref.push().set({
        "name": body.name,
        "price": body.price,
        "location": body.location,
        "stock": body.stock
    });
    callback(0);
};

//idProduct
function idProduct(callback) {
    var ref = db.ref('id/product');
    ref.once("value").then(function(snapshot) {
        ref.update({
            "product": snapshot.val() + 1
        });
        callback(snapshot.val());
    });

};
*/
//Login 
app.post('/login', (req, res) => {
    userExist(req.body, function(data) {
        console.log(data);
        if (data == 0) {
            res.send({
                "code": 0,
                "msg": "Usuario no existe",
                "name": null,
                "car": null,
                "email": null
            })
        } else {
            login(req.body, function(data) {
                if (data == 0) {
                    res.send({
                        "code": 0,
                        "msg": "Error en las credenciales",
                        "name": null,
                        "car": null,
                        "email": null
                    })
                } else {
                    res.send({
                        "code": 1,
                        "msg": "Loging Correcto",
                        "name": data.child("name").val(),
                        "car": data.child("car").val(),
                        "email": data.child("email").val() 
                    })
                    console.log("Te has logueado: " + data.child("name").val());
                }
            });

        }
    });
});
app.get('/test', (req, res) => {
    res.send({
        "status": ok
    });
})

//Registrar usuario
app.post('/register', (req, res) => {
    userExist(req.body, function(data) {
        console.log(data);
        if (data == 0) {
            var ref = db.ref('users');
            ref.child(req.body.user).set({
                "pwd": req.body.pwd,
                "name": req.body.name,
                "car": req.body.car,
                "sex": req.body.sex,
                "email": req.body.email,
                "type": "1"
            });
            var mailGenerator = new Mailgen({
                theme: 'salted',
                product: {
                    name: 'ulimarket',
                    link: 'alert("Estamos preparando este boton!");',
                    copyright: 'Todos los derechos reservados por ULIMARKET'
                        //logo: 'http://registrobd.perupetro.com.pe:8080/RegistroPaquetes/Imagenes/banner%20superior-1.jpg'
                }
            });
            var email = {
                body: {
                    greeting: 'Hola, ' + req.body.name,
                    signature: 'Saludos, ',
                    title: 'Bienvenido a ULIMARKET',
                    name: "Nombre",
                    intro: 'Listo para comprar productos por tu aplicación favorita? Que bueno! Aprovecha esta aplicación al máximo!',
                    action: {
                        instructions: 'Acotaciones ',
                        button: {
                            color: '#22BC66',
                            text: 'Ingresa a la web',
                            link: 'alert("Estamos preparando la mejor web para ti");'
                        }
                    },
                    outro: 'Cualquier consulta o inconveniente comunicarse a : servicioulimarket@gmail.com'
                }
            };

            var emailBody = mailGenerator.generate(email);

            var mailOptions = {
                from: 'ULlimarket',
                to: req.body.email,
                subject: 'Bienvenido a ULIMARKET!',
                text: 'text',
                html: emailBody
            };

            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    return done({ cod: 0, msg: "Error envio de mensaje" });
                }
                console.log('Message sent: ' + info.response);
            });

            res.send({
                "code": 1,
                "msg": "Usuario Registrado",
                "name": null,
                "car": null,
                "email": null
            });
            //registrar usuario.
        } else {

            res.send({
                "code": 0,
                "msg": "Usuario ya existe",
                "name": null,
                "car": null,
                "email": null
            });
        }
    });
});

//Registrar Producto en cada usuario
app.post('/register/product', (req, res) => {
    var ref = db.ref('users/' + req.body.user + '/products');
    ref.push().set({
        "name": req.body.name,
        "price": req.body.price,
        "location": req.body.location,
        "stock": req.body.stock
    });
    res.send({
        "cod": 1,
        "msg": "Producto registrado"
    })
});
// verifica si el usuario tiene productos creados.
app.post('/has/product', (req, res) => {
    var ref = db.ref('users/' + req.body.user + '/products');
    ref.once('value').then(function(snapshot) {
        if (snapshot.val() == null) {
            res.send(snapshot.val());
        } else {
            res.send(snapshot.val());
        }
        console.log(snapshot.val());
    });
});



//Poner a vender un producto y definir la disponibilidad
app.post('/sale/product', (req, res) => {
    //req=idproducto, user,availability
    availability(req.body, function(data) {
        console.log(data);
        if (data == 0) {
            console.log(req.body);
            var ref = db.ref('users/' + req.body.user);
            ref.update({
                "availability": req.body.availability
            });
            db.ref().update({
                "sales": req.body.idProduct
            });
        } else {
            //ventas poner en "sales": idProduct
            sales(function(data) {
                if (data == 0) { //En caso no exista el snapshot.key
                    db.ref().update({
                        "sales": req.body.idProduct
                    });
                    //res.send() producto ya existe
                } else { //En caso si exita snapshot.key
                    var ref1 = db.ref('/sales');
                    ref1.once('value').then(function(snapshot) {
                        arregloId = snapshot.val().split(",");
                        for (var i = 0; i < arregloId.length; i++) {
                            if (arregloId[i] == req.body.idProduct) {
                                //res.send() producto ya existe
                            } else {
                                db.ref().update({
                                    "sales": snapshot.val() + "," + req.body.idProduct
                                });
                                //res.send ()  Producto ingresado
                            };
                        };
                    });
                };
            });
        };
    });
});


//Renovar contraseña
app.post('/forgotpassword', (req, res) => {
    console.log(req.body);
    caracteres = "0123456789abcdefABCDEF";
    longitud = 20;
    var newPassword;
    rand_code(caracteres, longitud, function(data) {
        newPassword = data;
        console.log(data);
        correoEsDeEsaPersona(req.body, function(data) {
            console.log(data);
            if (data == 0) {
                var ref = db.ref('users/' + req.body.user);
                ref.update({ "pwd": newPassword });
                var mailGenerator = new Mailgen({
                    theme: 'salted',
                    product: {
                        name: 'ulimarket',
                        link: 'alert("Estamos preparando este boton!");',
                        copyright: 'Todos los derechos reservados por ULIMARKET'
                            //logo: 'http://registrobd.perupetro.com.pe:8080/RegistroPaquetes/Imagenes/banner%20superior-1.jpg'
                    }
                });
                var email = {
                    body: {
                        greeting: 'Hola, ' + req.body.name,
                        signature: 'Saludos, ',
                        title: 'Renovacion de contraseña',
                        name: "Nombre",
                        intro: 'Se restablecio tu contraseña. Tu nueva contraseña es: ' + newPassword,
                        action: {
                            instructions: 'Acotaciones ',
                            button: {
                                color: '#22BC66',
                                text: 'Ingresa a la web',
                                link: 'alert("Estamos preparando la mejor web para ti");'
                            }
                        },
                        outro: 'Cualquier consulta o inconveniente comunicarse a : servicioulimarket@gmail.com'
                    }
                };

                var emailBody = mailGenerator.generate(email);

                var mailOptions = {
                    from: 'ULlimarket',
                    to: req.body.email,
                    subject: 'Renovacion de contraseña',
                    text: 'text',
                    html: emailBody
                };

                transporter.sendMail(mailOptions, function(error, info) {
                    if (error) {
                        return done({ cod: 0, msg: "Error envio de mensaje" });
                    }
                    console.log('Message sent: ' + info.response);
                });
                res.send({
                    "code": 1,
                    "msg": "Se renovo la contraseña satisfactoriamente",
                    "name": null,
                    "car": null,
                    "email": null
                });
            } else {
                res.send({
                    "code": 0,
                    "msg": "Usuario y correo no hacen match",
                    "name": null,
                    "car": null,
                    "email": null
                });

            }
        });




    });

});



app.listen(3000, () => {
    console.log('Puerto 3000');
});