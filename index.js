const express = require("express");
const app = express();
var bodyParser = require('body-parser')
const nodemailer = require("nodemailer")
const http = require('http');
const cors = require("cors");
var mysql = require('mysql');
const session = require("express-session");
const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
const { Server } = require("socket.io");

const { isObject } = require("util");
var conn = mysql.createConnection({
    host    : 'localhost',
    user    : 'root',
    password: '',
    database: 'website'
});
const server = http.createServer(app)
// IO
const io = new Server(server,{
    cors : {
        origin : "http://localhost:3001",
        methods: ["GET","POST"],
    }
})
io.on("connection", (socket)=>{
    socket.on("client_chat",function(data){
        socket.emit('Server_chat',data);
        socket.to(`room${data.id}`).emit("Send_room",(data));
        conn.query(`SELECT * FROM chat`,(err,resuft)=>{
            if(err) throw err;
            const find = resuft.find((x)=>{
                return x.room == data.id;
            })
            if(!find){
                const arr = [];
                console.log(data)
                arr.push(data);
                const arr1 = JSON.stringify(arr);
                conn.query(`INSERT INTO chat ( room , chat_data) VALUES ('${data.id}','${arr1}')`,(err,resuft)=>{
                    if(err){
                        console.log(err)
                    }else{
                        console.log('Insert')
                    }
                })
            }else{
                const sql1 = `SELECT * FROM chat WHERE room=${data.id}`
                conn.query(sql1,(err,resuft)=>{
                    if(err){

                    }else{
                        const chat = JSON.parse(resuft[0].chat_data)
                        chat.push(data)
                        conn.query(`UPDATE chat SET chat_data='${JSON.stringify(chat)}' WHERE room='${data.id}'`,(err1,resuft1)=>{
                            if(err){
                                console.log(err1)
                            }else{
                                console.log("Update")
                            }
                        })
                    }
                })
            }
        })
    })
    socket.on('join',function(data){
        socket.join(data);
        // console.log( io.sockets.adapter.rooms)
    })
    // socket.on("Insert", function(id){
    //     const arr = new Array();
    //     const arr1 = JSON.stringify(arr);
    //     conn.query(`INSERT INTO chat (chat_data,room) VALUES ('${arr1}','${id}')`,(err1,resuft1)=>{
    //         if(err1){
    //             console.log(err1)
    //         }else{
    //             console.log("Insert");
    //         }
    //     })
    // })
    socket.on("disconnection",()=>{
        console.log("User Disconnected" , socket.id)
    })
})
app.use(session({
    secret : "khangpdk2000",
    resave : true,
    saveUninitialized : true
}))
conn.connect();
app.use(bodyParser.json());
app.use(cors());
// --------------------------------------------------------------------------------USER----------------------------------------------//
// Loggin user
app.get(`/api/get/chatone/:id`,(req,res)=>{
    const id = req.params.id
    const sql = `SELECT * FROM chat WHERE room=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json()
        }else{
            const data = JSON.parse(resuft[0].chat_data);
            res.status(200).json(data)
        }
    })
})
app.post('/api/post/chat',(req,res)=>{
    const { chat , room } = req.body
    const sql = `INSERT INTO chat (chat_data,room) VALUES ('${chat}','${room}')`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Insert Thanh Cong");
        }
    })
})
app.get(`/api/get/chatAll/`,(req,res)=>{
    const sql = `SELECT * FROM chat`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
app.get("/api/user/",(rep,res)=>{
    const sql = "SELECT * FROM user";
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
app.get("/api/user/:id",(req,res)=>{
        const id = req.params.id
        const sql = `SELECT * FROM user WHERE id=${id}`;
            conn.query(sql,(err,resuft)=>{
                if(err){
                    res.status(500).json(err);
                    
                }else{
            res.status(200).json(resuft);
        }
    })
})
// Login User
app.post('/api/user/login/',async (req,res)=>{
    const { account , password } = req.body;
    const sql = `SELECT * FROM user`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            const find = resuft.find((x)=>{
              return x.account == account
            })
            if(!find){
                res.status(401).json("Sai tài khoản")
            }else{
                const confim = bcrypt.compare(
                    password,
                    find.password
                ) 
                if(!confim){
                    res.status(401).json("Sai mặt khẩu");
                }else{
                    const { password , ...user  } = find
                    res.status(200).json({...user})
                }
            }

        }
    })
})
// Register user
app.post("/api/user/", async (req,res)=>{
    // const { name , account , password ,email , image } = req.body;
    const salf = await bcrypt.genSalt(10);
    const hashPassWord = await bcrypt.hash(req.body.password,salf);
    const sql = `INSERT INTO user ( name , account , password , email ) VALUES ( "${req.body.name}", "${req.body.account}" , "${hashPassWord}" , "${req.body.email}")`;
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err);
        }else{
            res.status(200).json(req.body)
        }
    })
    
})
// Put password user 
app.put("/api/user/:id" , async (req,res)=>{
    const id = req.params.id
    const { password , passNew } = req.body;
    const sqlSelect = `SELECT * FROM user WHERE id=${id}`
    const saft = await bcrypt.genSalt(10)
    const HasPass = await bcrypt.hash(passNew,saft)
    conn.query(sqlSelect,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            // res.status(200).json(resuft[0])
            const confim = bcrypt.compare(
                password,
                resuft[0].password
            ) 
            if(!confim){
                res.status(400).json("Error")
            }else{
                conn.query(`UPDATE user SET password='${HasPass}' WHERE id=${id}`,(err,resuft1)=>{
                    if(err){
                        res.status(400).json("Querry Error")
                    }else{
                        res.status(200).json("Cập nhật mặt khẩu thành công")
                    }
                })
            }
            
            // if(!confim){
            //     res.status(401).json("Mặt khẩu thay đổi chưa đúng")
            // }else{
                // res.status(200).json("Mat khau dung r")
                // const HasPass = bcrypt.hash(passNew,bcrypt.genSalt(10))
                // const sqlUpdate = `UPDATE user SET password=${HasPass} WHERE id=${id}`;
                // conn.query(sqlUpdate,(err,resuf1t)=>{
                //     if(err){
                //         res.status(500).json("Lỗi update")
                //     }else{
                //         res.status(200).json("Update thành công");
                //     }
                // })
            
        }
    })
})


//--------------------------------------------------------ADDRESS----------------------------------------------------//
app.get("/api/address/:id",(req,res)=>{
    const id = req.params.id
    const sql = `SELECT * FROM address WHERE user_id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err);
        }else{
            res.status(200).json(resuft);
        }
    })
    
})
// get address theo id
app.get("/api/addressid/:id",(req,res)=>{
    const id =  req.params.id;
    const sql = `SELECT * FROM address WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft);
        }
    })
})
app.post("/api/address/",(req,res)=>{
    const { number , address , phone , user_id , status , name } = req.body;
    const sql = `INSERT INTO address ( number , address , phone , user_id , status , name ) VALUES ( "${number}", "${address}" , "${phone}" , "${user_id}" , "${status}","${name}" )`;
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err);
        }else{
            res.status(200).json("Post thanh cong");
        }
    })
})
app.put("/api/addressid/:id" , (req,res)=>{
    const { number , address , phone  , status , name } = req.body;
    const id = req.params.id 
    // console.log(address)
    const sql = `UPDATE address SET address="${address}",number="${number}",phone="${phone}",status="${status}" , name="${name}"  WHERE id=${id}`
    
    const sqlStatus = `UPDATE address SET address="${address}",number="${number}",phone="${phone}" , name="${name}"  WHERE id=${id}`
    if(status){
        conn.query(sql,(err,resuft)=>{
            if(err){
                res.status(500).json(err)
            }else{
                res.status(200).json("Update thành công");
            }
        })
    }else{
        conn.query(sqlStatus,(err,resuft)=>{
            if(err){
                res.status(500).json(err)
            }else{
                res.status(200).json("Update thành công");
            }
        })
    }
    // const sql = `UPDATE address SET number=${number},address=${address},phone=${phone} ,status=${status} WHERE id=${id}`;
})

//---------------------------------------------------------Product------------------------------------------------------------------------------------------//
// get all Product 

app.get("/api/product/",(req,res)=>{
    const sql = "SELECT * FROM product INNER JOIN brand ON brand.idBrand = product.brand_id"
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err);
        }else{
            res.status(200).json(resuft);
        }
    })
})
app.get("/api/product/limit",(req,res)=>{
    const limit = req.query.limit
    const sql = `SELECT * FROM product INNER JOIN brand ON brand.idBrand = product.brand_id LIMIT ${limit}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err);
        }else{
            res.status(200).json(resuft);
        }
    })
})

// get a product for id
app.get("/api/product/:id" , (req,res)=>{
    const params = req.params.id
    const sql = `SELECT * FROM product INNER JOIN brand ON brand.idBrand = product.brand_id WHERE product.id=${params}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json("Err query")
        }else{
            res.status(200).json(resuft)
        }
    })
})
// Tìm sản phẩm liên quan theo thương hiệu
app.get("/api/product/tranlace/:id", (req,res)=>{
    // const brand_id = req.params.brand_id
    const id = req.params.id
    const sqlBrand = `SELECT * FROM product INNER JOIN brand ON product.brand_id = brand.idBrand WHERE id=${id}`
    conn.query(sqlBrand,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            const name = resuft[0].brandName
            // res.status(200).json(name)
            const sql = `SELECT * FROM product INNER JOIN brand ON product.brand_id = brand.idBrand WHERE brandName='${name}' `
            conn.query(sql,(err1,resuft1)=>{
                if(err1){
                    res.status(500).json(err1)
                }
                else {
                    res.status(200).json(resuft1)
                }
            }) 
        }
    })
})

// Gio hang cua user 
app.get("/api/cart/:id",(req,res)=>{
    const idUser = req.params.id
    const sql = `SELECT * FROM cart WHERE user_id=${idUser}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200) .json(resuft)
        }
    })
})

// Dua san pham vao gio hang

app.post("/api/cart/",(req,res)=>{
    const { cart_name , cart_image , cart_price , cart_sl , user_id , product_id } = req.body
    const sql = `INSERT INTO cart (cart_name,cart_image,cart_price,cart_sl,user_id,product_id) VALUES ('${cart_name}','${cart_image}','${cart_price}','${cart_sl}',${user_id},${product_id})`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200) .json(req.body)
        }
    })
})


// Xóa san pham trong gio hang
app.delete("/api/cart/delete/:id",(req,res)=>{
    const id = req.params.id;
    const sql = `DELETE FROM cart WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200) .json("Xóa sản phẩm thành công");
        }
    })
})


// Chinh sua sl san pham
app.put("/api/cart/put/:id",(req,res)=>{
    const id = req.params.id;
    const { cart_sl } = req.body
    const sql = `UPDATE cart SET cart_sl=${cart_sl} WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200) .json("Update sản phẩm thành công");
        }
    })
})

// tim kiem trong san pham
app.get("/api/seach/", (req,res)=>{
    const seach = req.query.seach
    const sql = `SELECT * FROM product INNER JOIN brand ON product.brand_id = brand.idBrand WHERE name LIKE '%${seach}%'`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})

// Phan trang trong san pham
app.get("/api/pagination/",(req,res)=>{
    const limit = req.query.limit
    const page = req.query.page
    const sqlProduct = `SELECT * FROM product INNER JOIN brand ON brand.idBrand = product.brand_id`
    conn.query(sqlProduct,(err,resuft)=>{
        if(err){
            res.status(500).json(err) ;
        }else {
            const sql = `SELECT * FROM product INNER JOIN brand ON brand.idBrand = product.brand_id LIMIT ${limit} OFFSET ${page*limit}`
            conn.query(sql,(err,resuft1)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    const data = {
                        data : resuft1, 
                        pagination : {
                            limit : limit,
                            page : page,
                            length : resuft.length
                        }    
                    }
                    res.status(200).json(data)
                }
            })
            
        }
    })
})
// Sap xep theo gia tien
app.get( "/api/sort/" ,(req,res)=>{
    const limit = req.query.limit
    const page = req.query.page 
    const sql = `SELECT * FROM product INNER JOIN brand ON brand.idBrand = product.brand_id`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})

// Dang nhap admin 
app.get("/api/admin",(req,res)=>{
    const sql = `SELECT * FROM admin`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})

// Vi tri cua nha hang 

app.get("/api/stort/",(req,res)=>{
    const sql = `SELECT * FROM stort`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
// Post lien he cua khach hang 

// Send File Khi contact
// var source = fs.readFileSync(path.join(__dirname, '/view/index.handlebars'), 'utf8');
// var template = hbs.compile(source);
app.post("/api/contact/",(req,res)=>{
    console.log(req.body)
    const tranpost = nodemailer.createTransport({
        service : "gmail",
        auth: {
            user: "khangb1809355@student.ctu.edu.vn",
            pass: "povkqtsseswnbtbr"
        }
    })

    const mailOptions = {
        from: req.body.email,
        to: "khangB1809355@student.ctu.edu.vn",
        subject: `Tin gửi từ ${req.body.email}:)`,
        text : req.body.note
    }
    tranpost.sendMail(mailOptions,(error,info)=>{
        if(error){
            console.log(error)
            res.send("error")
        }
        else{
            console.log("Gui thanh cong")
            res.send("succecs")
        }
    })
})


// San Pham Duoc yeu thich nhat
app.get("/api/productLike/",(req,res)=>{
    const sql = "SELECT * FROM product ORDER BY product_like DESC LIMIT 5"
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
// Post like product 
app.post("/api/like/:id",(req,res)=>{
    const { product_like } = req.body
    const id = req.params.id
    const sql = `UPDATE product SET product_like = ${product_like} WHERE id = ${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(req.body)
        }
    })
})
// Save like Product
app.get("/api/likeProductSave",(req,res)=>{
    const user_id = req.query.user_id
    const product_id = req.query.product_id
    const sql = `SELECT * FROM like_product WHERE user_id=${user_id} AND product_id=${product_id} `
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft[0])
        }
    })
})
app.put("/api/likeProduct",(req,res)=>{
    const { status } = req.body
    const product_id = req.query.product_id
    const user_id = req.query.user_id
    const id = req.params.id 
    const sql = `UPDATE like_product SET status='${status}' WHERE user_id=${user_id} AND product_id=${product_id}`
    
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(req.body)
        }   
    })
})
app.delete("/api/likeProduct/",(req,res)=>{
    const user_id = req.query.user_id
    const product_id = req.query.product_id
    const sql = `DELETE FROM like_product WHERE user_id=${user_id} AND product_id=${product_id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Xoa du lieu thanh cong")
        }
    })
})
app.post("/api/likeProuct",(req,res)=>{
    const { user_id , product_id , status } = req.body
    const sql =  `INSERT INTO like_product (user_id,product_id,status) VALUES ('${user_id}','${product_id}','${status}')`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(req.body)
        }
    })
})
// Lay all hinh anh cua product id 
app.get("/api/image/:id",(req,res)=>{
    const id = req.params.id
    const sql =  `SELECT * FROM image WHERE product_id = ${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft[0])
        }
    })
})


// Dat hang thanh toan san pham 
app.post("/api/order/",(req,res)=>{
    const { order_code ,order_note , order_status , order_email , address_id , order_data , order_date , order_pay , order_tranpost , order_create_at} = req.body
    const { total } = JSON.parse(order_pay)
    const  arrData = JSON.parse(order_data)
    console.log(arrData)
    // Cong De Gui Gmail
    const tranpost = nodemailer.createTransport({
        service : "gmail",
        auth: {
            user: "khangb1809355@student.ctu.edu.vn",
            pass: "povkqtsseswnbtbr"
        }
    })
    const mailOptions = {
        from: "khangb1809355@student.ctu.edu.vn",
        to: `${order_email}`,
        subject: `Xác nhận đơn hàng #${order_code} từ Halurestaurant`,
        text : ""
        
    }
    tranpost.sendMail(mailOptions,(error,info)=>{
        if(error){
            console.log(error)
            res.send("error")
        }
        else{
            console.log("Gui thanh cong")
            res.send("succecs")
        }
    })


    
    const sql = `INSERT INTO order_product (order_code,order_note,order_status,order_email,address_id,order_data,order_date,order_pay,order_tranpost,order_create_at) VALUES ('${order_code}','${order_note}','${order_status}','${order_email}','${address_id}','${order_data}','${order_date}','${order_pay}','${order_tranpost}','${order_create_at}')` 
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(req.body)
        }
    })
})
// Xóa tắc cả sản phẩm trông cart với id = id User
app.delete("/api/deleteAll/product/:id",(req,res)=>{
    const id = req.params.id
    const sql = `DELETE FROM cart WHERE user_id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Delete Success!")
        }
    })
})

// Get san pham da duoc dat hang 
app.get("/api/order/:id",(req,res)=>{
    const id = req.params.id
    const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id WHERE address.user_id=${id} AND  (order_tranpost="Đang chuẩn bị" OR order_tranpost="Đang giao" OR order_tranpost="Chưa chuyển") ORDER BY order_product.order_id DESC` 
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
app.get("/api/order/cancelDelete/:id",(req,res)=>{
    const id = req.params.id
    const sql = `SELECT * FROM order_cancel INNER JOIN order_product ON order_product.order_id = order_cancel.order_id INNER JOIN address ON order_product.address_id = address.id  WHERE address.user_id=${id}  AND  (order_tranpost="Hủy đơn" OR order_tranpost="Hủy đơn hàng") ORDER BY order_product.order_id DESC` 
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
app.get("/api/order/recive/:id",(req,res)=>{
    const id = req.params.id
    const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id WHERE address.user_id=${id} AND  (order_tranpost="Đã nhận hàng")` 
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
// Get chi tiet san pham da duoc dat hang 
app.get("/api/detaileOrder/:id",(req,res)=>{
    const id = req.params.id
    const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id WHERE order_id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft[0]);
        }
    })
})

// User duoc khuyen Mai
app.get("/api/discount/:id",(req,res)=>{
    const id = req.params.id
    const sql = `SELECT * FROM discountcode WHERE user_id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})


// User delete khuyen mai 
app.delete("/api/deleteCount/:id",(req,res)=>{
    const id = req.params.id 
    const sql = `DELETE FROM discountcode WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Delete success")
        }
    })
})

// Get all don hang chua duoc xu li 
app.get("/api/handel/",(req,res)=>{
    const limit = req.query.limit
    const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id WHERE order_tranpost="Chưa chuyển" LIMIT ${limit}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})

// Get all don hang
app.get("/api/orderAll/",(req,res)=>{
    const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})

// Đơn hàng đang đang chuẩn bị 
app.get("/api/Prepare/",(req,res)=>{
    const limit = req.query.limit
    const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id WHERE order_tranpost='Đang chuẩn bị' LIMIT ${limit}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
// Don hang dang giao 
app.get("/api/shipOrder/",(req,res)=>{
    const limit = req.query.limit
    const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id WHERE order_tranpost='Đang giao' LIMIT ${limit}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})


// Tac ca don hang danh xu ly
app.get("/api/OrderYou/",(req,res)=>{
    const sql = "SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id WHERE order_tranpost='Đang chuẩn bị' OR order_tranpost='Đang giao'"
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
// Đã thanh toán 
app.get("/api/Paid/",(req,res)=>{
    const limit = req.query.limit
    const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id WHERE order_tranpost='Đã nhận hàng' LIMIT ${limit}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
//
app.get("/api/canel/order/",(req,res)=>{
    const limit = req.query.limit
    const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id INNER JOIN order_cancel ON order_cancel.order_id = order_product.order_id WHERE order_tranpost='Hủy đơn hàng' LIMIT ${limit}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
app.get("/api/canel/order/success/",(req,res)=>{
    const limit = req.query.limit
    const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id INNER JOIN order_cancel ON order_cancel.order_id = order_product.order_id WHERE order_tranpost='Hủy đơn' LIMIT ${limit}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})


// Update lai trang thai don hang 

app.put("/api/update/order/:id",(req,res)=>{
   const id = req.params.id
   const { order_tranpost,order_date } = req.body
   const sql = `UPDATE order_product SET order_tranpost='${order_tranpost}' WHERE order_id=${id}`
   conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Update success")
        }
   })
})
app.put("/api/update/orderAdmin/:id",(req,res)=>{
   const id = req.params.id
   const { order_tranpost,order_date } = req.body
   const sql = `UPDATE order_product SET order_tranpost='${order_tranpost}' , order_date='${order_date}' WHERE order_id=${id}`
   conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Update success")
        }
   })
})


// Get don hang da nhan voi id 
app.get("/api/get/order/:id",(req,res)=>{
    const id = req.params.id
    const sql = `SELECT order_status FROM order_product WHERE order_id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft[0])
        }
    })
})
app.post("/api/post/order/",(req,res)=>{
    const { order_reason , order_id , order_cancel_date } = req.body
    const sql = `INSERT INTO order_cancel (order_reason , order_id , order_cancel_date) VALUES ('${order_reason}','${order_id}','${order_cancel_date}')`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(req.body)
        }
    })
})

// Update status paid 
app.put("/api/update/paid/:id",(req,res)=>{
    const id = req.params.id
    const { order_status } = req.body
    const sql = `UPDATE order_product SET order_status='${order_status}' WHERE order_id = ${id} `
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Update status Thanh cong")
        }
    })
})



// Xoa san pham voi id san pham 

app.delete("/api/product/delete/:id",(req,res)=>{
    const id = req.params.id
    const sql = `DELETE FROM product WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Delete Success!")
        }
    })
})


// Yêu cầu hủy đơn hàng



// Get thuong hieu san pham

app.get("/api/brand/",(req,res)=>{
    const sql = "SELECT * FROM brand"
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
app.post("/api/brand/",(req,res)=>{
    const { brandName } = req.body
    const sql = `INSERT INTO brand (brandName) VALUES ('${brandName}')`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Post thanh cong")
        }
    })
})
app.put("/api/brand/edit/:id",(req,res)=>{
    const { brandName } = req.body
    const id = req.params.id
    const sql = `UPDATE brand SET brandName='${brandName}' WHERE idBrand=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Update thanh cong")
        }
    })
})
app.delete("/api/brand/:id",(req,res)=>{
    // const { brandName } = req.body
    const id = req.params.id

    const sql = `DELETE FROM brand WHERE idBrand=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Xoa thanh cong")
        }
    })
})



//
app.get("/api/candelProduct/:id",(req,res)=>{
    const id = req.params.id 
    const sql = `SELECT * FROM order_cancel WHERE order_id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})

// post xac nhan huy don hang thanh cong
app.put("/api/cancel/confim/order/:id",(req,res)=>{
    const { order_confim_date } = req.body
    const id = req.params.id
    const sql = `UPDATE order_cancel SET order_confim_date='${order_confim_date}' WHERE order_id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Update Thanh cong")
        }
    })
})

/// Đăng thêm sản phẩm mới 
app.post("/api/post/product/",(req,res)=>{
    const { count , name , price , priceN , brand_id , description , product_like , image , list_image } = req.body
    const sql = `INSERT INTO product (name,price,image,description,brand_id,product_like,count,priceN,list_image) VALUES ('${name}','${price}','${image}','${description}','${brand_id}','${product_like}','${count}','${priceN}','${list_image}')`
    conn.query(sql,(err,resuft)=>{
        if(err){
            
            res.status(500).json(err)
        }else{
            res.status(200).json(req.body)
        }
    })
})

app.put("/api/put/product/:id",(req,res)=>{
    const id = req.params.id
    const { count , name , price , priceN , brand_id , description , product_like , image , list_image } = req.body
    const sql = `UPDATE product SET count='${count}',name='${name}',price='${price}',priceN='${priceN}',brand_id='${brand_id}',description='${description}',product_like='${product_like}',image='${image}',list_image='${list_image}' WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Update success");
        }
    })
})




// Quản lý slider 
app.get("/api/Getslider/",(req,res)=>{
    const sql = `SELECT * FROM slider`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
app.post("/api/Postslider/",(req,res)=>{
    const { image } = req.body
    const sql = `INSERT INTO slider (image) VALUES ('${image}')`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Post thanh cong")
        }
    })
})

app.put("/api/Putslider/:id",(req,res)=>{
    const { id } = req.params.id 
    const { image } = req.body
    const sql = `UPDATE slider SET image=${image} WHEWE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err);
        }else{
            res.status(200).json("Update success");
        }
    })
})

app.delete("/api/Deleteslider/:id",(req,res)=>{
    const id = req.params.id 
    const sql = `DELETE FROM slider WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Xoa thanh cong");
        }
    })
})
// Delete all slider 
app.delete("/api/DeleteAll/",(req,res)=>{
    const sql = `DELETE FROM slider`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Xoa thanh cong");
        }
    })
})


// Post commnet Stort 
app.post("/api/comment/stort/",(req,res)=>{
    const { comment_star , comment_description , user_id } = req.body
    const sql = `INSERT INTO comment_stort (comment_star,comment_description,user_id) VALUES ('${comment_star}','${comment_description}','${user_id}')`
    conn.query(sql,(err,resuft)=>{
        if(err){    
            res.status(500).json(err)
        }else{
            res.status(200).json(req.body)
        }
    })
})
// Get commnet khach hang

app.get("/api/getCommnet/stort/",(req,res)=>{
    const sql = `SELECT * FROM user INNER JOIN comment_stort ON user.id=comment_stort.user_id ORDER BY comment_stort_id DESC`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})


// Cap nhat lai so luong cua product id 
app.put("/api/updateCount/product/:id",(req,res)=>{
    const id = req.params.id 
    const { count } = req.body
    const sql = `UPDATE product SET count=${count} WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Update thanh cong")
        }
    })
})
app.get("/api/order1/all/",(req,res)=>{
    const sql = 'SELECT * FROM order_product'
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})


app.get("/api/getProductSl/",(req,res)=>{
    // const id = req.params.id
    // Don hang da nhan hang 
    const sql = ` SELECT COUNT(user.id) as Soluong,user.id,user.name,user.email FROM user INNER JOIN address ON user.id=address.user_id INNER JOIN order_product ON address.id = order_product.address_id GROUP BY user_id`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)

        }
    })

})

app.get("/api/getProductSl/:id",(req,res)=>{
    const id = req.params.id
    // Don hang da nhan hang 
    const sql = `SELECT * FROM user INNER JOIN address ON user.id=address.user_id INNER JOIN order_product ON address.id = order_product.address_id WHERE user.id = ${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })

})

// Post khuyen mai
app.post("/api/discount/:id",(req,res)=>{
   const id = req.params.id
   const { code , disprice , discription } = req.body
   const sql = `INSERT INTO discountcode (code,disprice,discription,user_id) VALUES ('${code}','${disprice}','${discription}','${id}')`
   conn.query(sql,(err,resuft)=>{
    if(err){
        res.status(500).json(err)
    }else{
        res.status(200).json(req.body)
    }
})
})



// News 
app.get("/api/news/",(req,res)=>{
    const sql = 'SELECT * FROM news'
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})
app.get("/api/page/news/",(req,res)=>{
    const limit = req.query.limit
    const page = req.query.page 
    const sql = `SELECT * FROM news LIMIT ${limit} OFFSET ${page*limit}`
    const sql1 = 'SELECT * FROM news'
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            conn.query(sql1,(err,resuft1)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    const len = resuft1.length
                    res.status(200).json({
                        data : resuft,
                        lenght : len
                    })
                }
            })
            // res.status(200).json(resuft)
        }
    })
    
})
app.get("/api/news/:id",(req,res)=>{
    const id = req.params.id
    const sql = `SELECT * FROM news WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft[0])
        }
    })
})
app.post("/api/news/",(req,res)=>{
    const { title , discription , image , date } = req.body
    const sql = `INSERT INTO news (image,title,discription,date) VALUES ('${image}','${title}','${discription}','${date}')`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(req.body)
        }
    })
})


app.delete("/api/deleteNews/:id",(req,res)=>{
    const id = req.params.id
    const sql = `DELETE FROM news WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Delete success")
        }
    })
})

app.put("/api/put/news/:id",(req,res)=>{
    const id = req.params.id
    const { image , discription , title } = req.body
    const sql = `UPDATE news SET image='${image}',discription='${discription}',title='${title}' WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Update thanh cong")
        }
    })
})

// Post Bài viết 
app.put('/api/posts/:id',(req,res)=>{
    const { posts } = req.body
    const id = req.params.id
    const sql = `UPDATE news SET posts='${posts}' WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Update thanh cong")
        }
    })
})

app.get("/api/allOrder/",(req,res)=>{
    const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id WHERE order_tranpost!="Hủy đơn hàng"`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err);
        }else{
            res.status(200).json(resuft);
        }
    })
})
app.get("/api/allOrder1/",(req,res)=>{
    const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id INNER JOIN user ON address.user_id = user.id`
    // const sql = `SELECT * FROM order_product INNER JOIN address ON order_product.address_id = address.id`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err);
        }else{
            res.status(200).json(resuft);
        }
    })
})
// Cap nhat lai thoi gian 
app.put("/api/update/time/:id",(req,res)=>{
    const { time } = req.body
    const id = req.params.id
    const sql = `UPDATE order_product SET order_create_at=${time} WHERE order_id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Cập nhật thành công");
        }
    })
})


// Cap nhat lai thoi gian don hang 
app.get("/api/get/time/order/:id",(req,res)=>{
   const id = req.params.id
   const sql = `SELECT order_date FROM order_product WHERE order_id=${id}` 
   conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft[0])
        }
   })
})
app.put("/api/time/order/:id",(req,res)=>{
    const id = req.params.id
    const { order_date } = req.body
    const sql = `UPDATE order_product SET order_date='${order_date}' WHERE order_id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(200).json(err)
        }else{
            res.status(500).json(req.body)
        }
    })
})


app.put('/api/update/status/pay/:id',(req,res)=>{
    const id = req.params.id
    const { order_status } = req.body
    const sql = `UPDATE order_product SET order_status='${order_status}' WHERE order_id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Update success")
        }
    })
})
// Quan ly doanh thu theo san phma 
app.get('/api/total/product',(req,res)=>{
    const d = req.query.d
    const m = req.query.m
    const y = req.query.y
    const sql = `SELECT order_data,order_date FROM order_product WHERE order_tranpost="Đã nhận hàng" AND order_status="false"`
    const sql1 = `SELECT * FROM product`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            conn.query(sql1,(err,resuftProduct)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    const today = new Date();
                    const time =today.getDate()+'/'+(today.getMonth()+1)+'/'+today.getFullYear();
                    const date = resuft.filter((x)=>{
                        return JSON.parse(x.order_date).success.split('-')[1] == `${d}/${m}/${y}`
                    })
                    const arr = new Array()
                    const value = date.map((x)=>{
                        return JSON.parse(x.order_data)
                    })

                    // Nhap chung ket noi lai thanh 1 mang doi tuong
                    value.map((x)=>{
                        x.map((x1)=>{
                            const find = arr.find((findProduct)=>{
                                return findProduct.product_id == x1.product_id
                            })
                            if(find){
                                const index = arr.indexOf(find)
                                arr[index].cart_sl = find.cart_sl + x1.cart_sl
                            }else{
                                arr.push(x1)    
                            }
                        })
                        return arr
                    })

                    resuftProduct.forEach(element => {
                        const find = arr.find((element1)=>{
                            return element.id == element1.product_id
                        })
                        if(find){
                            const index = arr.indexOf(find)
                            arr[index].priceN = element.priceN
                        }else{

                        }
                    });
                    const total = arr.reduce((prev,cur)=>{
                        return prev + (cur.cart_sl * cur.cart_price)
                    },0)
                    res.status(200).json({
                        data : arr,
                        total : total,
                        time : time
                    }
                    )
                }
            })


        }
    })
})
app.get('/api/totalTur/product',(req,res)=>{
    const d = req.query.d
    const m = req.query.m
    const y = req.query.y
    const sql = `SELECT order_data,order_date FROM order_product WHERE order_tranpost="Đã nhận hàng"`
    const sql1 = `SELECT * FROM product`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            conn.query(sql1,(err,resuftProduct)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    const today = new Date();
                    const time =today.getDate()+'/'+(today.getMonth()+1)+'/'+today.getFullYear();
                    const date = resuft.filter((x)=>{
                        return JSON.parse(x.order_date).success.split('-')[1] == `${d}/${m}/${y}`
                    })
                    const arr = new Array()
                    const value = date.map((x)=>{
                        return JSON.parse(x.order_data)
                    })

                    // Nhap chung ket noi lai thanh 1 mang doi tuong
                    value.map((x)=>{
                        x.map((x1)=>{
                            const find = arr.find((findProduct)=>{
                                return findProduct.product_id == x1.product_id
                            })
                            if(find){
                                const index = arr.indexOf(find)
                                arr[index].cart_sl = find.cart_sl + x1.cart_sl
                            }else{
                                arr.push(x1)    
                            }
                        })
                        return arr
                    })

                    resuftProduct.forEach(element => {
                        const find = arr.find((element1)=>{
                            return element.id == element1.product_id
                        })
                        if(find){
                            const index = arr.indexOf(find)
                            arr[index].priceN = element.priceN
                        }else{

                        }
                    });
                    const total = arr.reduce((prev,cur)=>{
                        return prev + (cur.cart_sl * cur.cart_price)
                    },0)
                    res.status(200).json({
                        data : arr,
                        total : total,
                        time : time
                    }
                    )
                }
            })


        }
    })
})
// Tong Doanh thu trong ngay
app.get('/api/totalAll/product',(req,res)=>{
    const d = req.query.d
    const m = req.query.m
    const y = req.query.y
    const sql = `SELECT order_data,order_date FROM order_product WHERE order_tranpost="Đã nhận hàng"`
    const sql1 = `SELECT * FROM product`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            conn.query(sql1,(err,resuftProduct)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    const today = new Date();
                    const time =today.getDate()+'/'+(today.getMonth()+1)+'/'+today.getFullYear();
                    const date = resuft.filter((x)=>{
                        return JSON.parse(x.order_date).success.split('-')[1] == `${d}/${m}/${y}`
                    })
                    const arr = new Array()
                    const value = date.map((x)=>{
                        return JSON.parse(x.order_data)
                    })

                    // Nhap chung ket noi lai thanh 1 mang doi tuong
                    value.map((x)=>{
                        x.map((x1)=>{
                            const find = arr.find((findProduct)=>{
                                return findProduct.product_id == x1.product_id
                            })
                            if(find){
                                const index = arr.indexOf(find)
                                arr[index].cart_sl = find.cart_sl + x1.cart_sl
                            }else{
                                arr.push(x1)    
                            }
                        })
                        return arr
                    })

                    resuftProduct.forEach(element => {
                        const find = arr.find((element1)=>{
                            return element.id == element1.product_id
                        })
                        if(find){
                            const index = arr.indexOf(find)
                            arr[index].priceN = element.priceN
                        }else{

                        }
                    });
                    const total = arr.reduce((prev,cur)=>{
                        return prev + (cur.cart_sl * cur.cart_price)
                    },0)
                    res.status(200).json({
                        data : arr,
                        total : total,
                        time : time
                    }
                    )
                }
            })


        }
    })
})
app.get('/api/totalonline/product',(req,res)=>{
    const d = req.query.d
    const m = req.query.m
    const y = req.query.y
    const sql = `SELECT order_data,order_date FROM order_product WHERE order_tranpost="Đã nhận hàng" AND order_status="online"`
    const sql1 = `SELECT * FROM product`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            conn.query(sql1,(err,resuftProduct)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    const today = new Date();
                    const time =today.getDate()+'/'+(today.getMonth()+1)+'/'+today.getFullYear();
                    const date = resuft.filter((x)=>{
                        return JSON.parse(x.order_date).success.split('-')[1] == `${d}/${m}/${y}`
                    })
                    const arr = new Array()
                    const value = date.map((x)=>{
                        return JSON.parse(x.order_data)
                    })

                    // Nhap chung ket noi lai thanh 1 mang doi tuong
                    value.map((x)=>{
                        x.map((x1)=>{
                            const find = arr.find((findProduct)=>{
                                return findProduct.product_id == x1.product_id
                            })
                            if(find){
                                const index = arr.indexOf(find)
                                arr[index].cart_sl = find.cart_sl + x1.cart_sl
                            }else{
                                arr.push(x1)    
                            }
                        })
                        return arr
                    })

                    resuftProduct.forEach(element => {
                        const find = arr.find((element1)=>{
                            return element.id == element1.product_id
                        })
                        if(find){
                            const index = arr.indexOf(find)
                            arr[index].priceN = element.priceN
                        }else{

                        }
                    });
                    const total = arr.reduce((prev,cur)=>{
                        return prev + (cur.cart_sl * cur.cart_price)
                    },0)
                    res.status(200).json({
                        data : arr,
                        total : total,
                        time : time
                    }
                    )
                }
            })


        }
    })
})
// Doanh thu theo thang 
app.get("/api/total/month/",(req,res)=>{
    const m = req.query.m
    const y = req.query.y
    // res.status(200).json(m)
    const sql = `SELECT order_data,order_date FROM order_product WHERE order_tranpost="Đã nhận hàng" AND order_status="false"`
    const sql1 = `SELECT * FROM product`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            // res.status(200).json()
            conn.query(sql1,(err,resuftProduct)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    // const today = new Date();
                    // const time = month
                    const date = resuft.filter((x)=>{
                        return JSON.parse(x.order_date).success.split('-')[1].split('/')[1]+JSON.parse(x.order_date).success.split('-')[1].split('/')[2] == m+y
                    })
                    const arr = new Array()
                    const value = date.map((x)=>{
                        return JSON.parse(x.order_data)
                    })

                    // Nhap chung ket noi lai thanh 1 mang doi tuong
                    value.map((x)=>{
                        x.map((x1)=>{
                            const find = arr.find((findProduct)=>{
                                return findProduct.product_id == x1.product_id
                            })
                            if(find){
                                const index = arr.indexOf(find)
                                arr[index].cart_sl = find.cart_sl + x1.cart_sl
                            }else{
                                arr.push(x1)    
                            }
                        })
                        return arr
                    })

                    resuftProduct.forEach(element => {
                        const find = arr.find((element1)=>{
                            return element.id == element1.product_id
                        })
                        if(find){
                            const index = arr.indexOf(find)
                            arr[index].priceN = element.priceN
                        }else{

                        }
                    });
                    const total = arr.reduce((prev,cur)=>{
                        return prev + (cur.cart_sl * cur.cart_price)
                    },0)
                    res.status(200).json({
                        data : arr,
                        total : total,
                        time : m
                    }
                    )
                }
            })
            
            
        }
    })
})
app.get("/api/totalAll/month/",(req,res)=>{
    const m = req.query.m
    const y = req.query.y
    // res.status(200).json(m)
    const sql = `SELECT order_data,order_date FROM order_product WHERE order_tranpost="Đã nhận hàng"`
    const sql1 = `SELECT * FROM product`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            // res.status(200).json()
            conn.query(sql1,(err,resuftProduct)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    // const today = new Date();
                    // const time = month
                    const date = resuft.filter((x)=>{
                        return JSON.parse(x.order_date).success.split('-')[1].split('/')[1]+JSON.parse(x.order_date).success.split('-')[1].split('/')[2] == m+y
                    })
                    const arr = new Array()
                    const value = date.map((x)=>{
                        return JSON.parse(x.order_data)
                    })

                    // Nhap chung ket noi lai thanh 1 mang doi tuong
                    value.map((x)=>{
                        x.map((x1)=>{
                            const find = arr.find((findProduct)=>{
                                return findProduct.product_id == x1.product_id
                            })
                            if(find){
                                const index = arr.indexOf(find)
                                arr[index].cart_sl = find.cart_sl + x1.cart_sl
                            }else{
                                arr.push(x1)    
                            }
                        })
                        return arr
                    })

                    resuftProduct.forEach(element => {
                        const find = arr.find((element1)=>{
                            return element.id == element1.product_id
                        })
                        if(find){
                            const index = arr.indexOf(find)
                            arr[index].priceN = element.priceN
                        }else{

                        }
                    });
                    const total = arr.reduce((prev,cur)=>{
                        return prev + (cur.cart_sl * cur.cart_price)
                    },0)
                    res.status(200).json({
                        data : arr,
                        total : total,
                        time : m
                    }
                    )
                }
            })
            
            
        }
    })
})
app.get("/api/totalonline/month/",(req,res)=>{
    const m = req.query.m
    const y = req.query.y
    // res.status(200).json(m)
    const sql = `SELECT order_data,order_date FROM order_product WHERE order_tranpost="Đã nhận hàng" AND order_status="online"`
    const sql1 = `SELECT * FROM product`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            // res.status(200).json()
            conn.query(sql1,(err,resuftProduct)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    // const today = new Date();
                    // const time = month
                    const date = resuft.filter((x)=>{
                        return JSON.parse(x.order_date).success.split('-')[1].split('/')[1]+JSON.parse(x.order_date).success.split('-')[1].split('/')[2] == m+y
                    })
                    const arr = new Array()
                    const value = date.map((x)=>{
                        return JSON.parse(x.order_data)
                    })

                    // Nhap chung ket noi lai thanh 1 mang doi tuong
                    value.map((x)=>{
                        x.map((x1)=>{
                            const find = arr.find((findProduct)=>{
                                return findProduct.product_id == x1.product_id
                            })
                            if(find){
                                const index = arr.indexOf(find)
                                arr[index].cart_sl = find.cart_sl + x1.cart_sl
                            }else{
                                arr.push(x1)    
                            }
                        })
                        return arr
                    })

                    resuftProduct.forEach(element => {
                        const find = arr.find((element1)=>{
                            return element.id == element1.product_id
                        })
                        if(find){
                            const index = arr.indexOf(find)
                            arr[index].priceN = element.priceN
                        }else{

                        }
                    });
                    const total = arr.reduce((prev,cur)=>{
                        return prev + (cur.cart_sl * cur.cart_price)
                    },0)
                    res.status(200).json({
                        data : arr,
                        total : total,
                        time : m
                    }
                    )
                }
            })
            
            
        }
    })
})
// Doanh thu trong nam
app.get("/api/total/year/:year",(req,res)=>{
    const year = req.params.year
    const sql = `SELECT order_data,order_date FROM order_product WHERE order_tranpost="Đã nhận hàng" AND order_status="false"`
    const sql1 = `SELECT * FROM product`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            conn.query(sql1,(err,resuftProduct)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    // const today = new Date();
                    const time = year
                    const date = resuft.filter((x)=>{
                        return JSON.parse(x.order_date).success.split('-')[1].split('/')[2] == year
                    })
                    const value = date.map((x)=>{
                        return JSON.parse(x.order_data)
                    })
                    
                    // Nhap chung ket noi lai thanh 1 mang doi tuong
                    const arr = new Array()
                    value.map((x)=>{
                        x.map((x1)=>{
                            const find = arr.find((findProduct)=>{
                                return findProduct.product_id == x1.product_id
                            })
                            if(find){
                                const index = arr.indexOf(find)
                                arr[index].cart_sl = find.cart_sl + x1.cart_sl
                            }else{
                                arr.push(x1)    
                            }
                        })
                        return arr
                    })

                    resuftProduct.forEach(element => {
                        const find = arr.find((element1)=>{
                            return element.id == element1.product_id
                        })
                        if(find){
                            const index = arr.indexOf(find)
                            arr[index].priceN = element.priceN
                        }else{

                        }
                    });
                    const total = arr.reduce((prev,cur)=>{
                        return prev + (cur.cart_sl * cur.cart_price)
                    },0)
                    res.status(200).json({
                        data : arr,
                        total : total,
                        time : time
                    }
                    )
                }
            })


        }
    })
})
// Tong danh thu theo nam
app.get("/api/totalAll/year/:year",(req,res)=>{
    const year = req.params.year
    const sql = `SELECT order_data,order_date FROM order_product WHERE order_tranpost="Đã nhận hàng"`
    const sql1 = `SELECT * FROM product`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            conn.query(sql1,(err,resuftProduct)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    // const today = new Date();
                    const time = year
                    const date = resuft.filter((x)=>{
                        return JSON.parse(x.order_date).success.split('-')[1].split('/')[2] == year
                    })
                    const value = date.map((x)=>{
                        return JSON.parse(x.order_data)
                    })
                    
                    // Nhap chung ket noi lai thanh 1 mang doi tuong
                    const arr = new Array()
                    value.map((x)=>{
                        x.map((x1)=>{
                            const find = arr.find((findProduct)=>{
                                return findProduct.product_id == x1.product_id
                            })
                            if(find){
                                const index = arr.indexOf(find)
                                arr[index].cart_sl = find.cart_sl + x1.cart_sl
                            }else{
                                arr.push(x1)    
                            }
                        })
                        return arr
                    })

                    resuftProduct.forEach(element => {
                        const find = arr.find((element1)=>{
                            return element.id == element1.product_id
                        })
                        if(find){
                            const index = arr.indexOf(find)
                            arr[index].priceN = element.priceN
                        }else{

                        }
                    });
                    const total = arr.reduce((prev,cur)=>{
                        return prev + (cur.cart_sl * cur.cart_price)
                    },0)
                    res.status(200).json({
                        data : arr,
                        total : total,
                        time : time
                    }
                    )
                }
            })


        }
    })
})
app.get("/api/total/yearonline/:year",(req,res)=>{
    const year = req.params.year
    const sql = `SELECT order_data,order_date FROM order_product WHERE order_tranpost="Đã nhận hàng" AND order_status="online"`
    const sql1 = `SELECT * FROM product`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            conn.query(sql1,(err,resuftProduct)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    // const today = new Date();
                    const time = year
                    const date = resuft.filter((x)=>{
                        return JSON.parse(x.order_date).success.split('-')[1].split('/')[2] == year
                    })
                    const value = date.map((x)=>{
                        return JSON.parse(x.order_data)
                    })
                    
                    // Nhap chung ket noi lai thanh 1 mang doi tuong
                    const arr = new Array()
                    value.map((x)=>{
                        x.map((x1)=>{
                            const find = arr.find((findProduct)=>{
                                return findProduct.product_id == x1.product_id
                            })
                            if(find){
                                const index = arr.indexOf(find)
                                arr[index].cart_sl = find.cart_sl + x1.cart_sl
                            }else{
                                arr.push(x1)    
                            }
                        })
                        return arr
                    })

                    resuftProduct.forEach(element => {
                        const find = arr.find((element1)=>{
                            return element.id == element1.product_id
                        })
                        if(find){
                            const index = arr.indexOf(find)
                            arr[index].priceN = element.priceN
                        }else{

                        }
                    });
                    const total = arr.reduce((prev,cur)=>{
                        return prev + (cur.cart_sl * cur.cart_price)
                    },0)
                    res.status(200).json({
                        data : arr,
                        total : total,
                        time : time
                    }
                    )
                }
            })


        }
    })
})

// Theo paypal


// Thong ke doanh thu theo tung thang cua nam 
app.get("/api/thongke/monthInYear/:id",(req,res)=>{
    const id = req.params.id
    const sql = `SELECT order_data,order_date FROM order_product WHERE order_tranpost="Đã nhận hàng"`
    const sql1 = `SELECT * FROM product`
    const sql2 = "SELECT * FROM product INNER JOIN brand ON brand.idBrand = product.brand_id"
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            const value = resuft.filter((x)=>{
                return JSON.parse(x.order_date).success.split('-')[1].split('/')[2] == id
            })
            const product = value.map((x)=>{  
                return {
                    data : {
                       productCart : JSON.parse(x.order_data),
                       month : JSON.parse(x.order_date).success.split('-')[1].split('/')[1]
                    }
                    
                }
            })
            // Cac san pham ban duoc cua thang 9
            const T9 = product.filter((x)=>{
                return x.data.month == 9
            })
            const T9Cart = T9.map((x)=>{
                return x.data.productCart
            })
            const arr = new Array()
            T9Cart.map((x)=>{
                x.map((x1)=>{
                    const find = arr.find((x2)=>{
                        return x2.product_id == x1.product_id
                    })
                    if(find){
                        const index = arr.indexOf(find)
                        arr[index].cart_sl = arr[index].cart_sl + x1.cart_sl 
                    }else{
                        arr.push(x1)
                    }

                }) 
            })
             
            // Cac san pham cua thang 10s
            const T10 = product.filter((x)=>{
                return x.data.month == 10
            })
            const T10Cart = T10.map((x)=>{
                return x.data.productCart
            })
            const arr10 = new Array()
            T10Cart.map((x)=>{
                x.map((x1)=>{
                    const find = arr10.find((x2)=>{
                        return x2.product_id == x1.product_id
                    })
                    if(find){
                        const index = arr10.indexOf(find)
                        arr10[index].cart_sl = arr10[index].cart_sl + x1.cart_sl 
                    }else{
                        arr10.push(x1)
                    }

                }) 
            })
           
            // Cac san pham cua thang 1
            const T1 = product.filter((x)=>{
                return x.data.month == 1
            })
            const T1Cart = T1.map((x)=>{
                return x.data.productCart
            })
            const arr1 = new Array()
            T1Cart.map((x)=>{
                x.map((x1)=>{
                    const find = arr1.find((x2)=>{
                        return x2.product_id == x1.product_id
                    })
                    if(find){
                        const index = arr1.indexOf(find)
                        arr1[index].cart_sl = arr1[index].cart_sl + x1.cart_sl 
                    }else{
                        arr1.push(x1)
                    }

                }) 
            })
            // Cac san pham thang 3
            const T3 = product.filter((x)=>{
                return x.data.month == 1
            })
            const T3Cart = T3.map((x)=>{
                return x.data.productCart
            })
            const arr3 = new Array()
            T3Cart.map((x)=>{
                x.map((x1)=>{
                    const find = arr3.find((x2)=>{
                        return x2.product_id == x1.product_id
                    })
                    if(find){
                        const index = arr3.indexOf(find)
                        arr3[index].cart_sl = arr3[index].cart_sl + x1.cart_sl 
                    }else{
                        arr3.push(x1)
                    }

                }) 
            })
            // San pham cua thang 4
            const T4 = product.filter((x)=>{
                return x.data.month == 1
            })
            const T4Cart = T4.map((x)=>{
                return x.data.productCart
            })
            const arr4 = new Array()
            T4Cart.map((x)=>{
                x.map((x1)=>{
                    const find = arr4.find((x2)=>{
                        return x2.product_id == x1.product_id
                    })
                    if(find){
                        const index = arr4.indexOf(find)
                        arr4[index].cart_sl = arr4[index].cart_sl + x1.cart_sl 
                    }else{
                        arr4.push(x1)
                    }

                }) 
            })

            // san pham cua thnag 5
            const T5 = product.filter((x)=>{
                return x.data.month == 1
            })
            const T5Cart = T5.map((x)=>{
                return x.data.productCart
            })
            const arr5 = new Array()
            T5Cart.map((x)=>{
                x.map((x1)=>{
                    const find = arr5.find((x2)=>{
                        return x2.product_id == x1.product_id
                    })
                    if(find){
                        const index = arr1.indexOf(find)
                        arr5[index].cart_sl = arr5[index].cart_sl + x1.cart_sl 
                    }else{
                        arr5.push(x1)
                    }

                }) 
            })
            // San pham cua thang 6 
            const T6 = product.filter((x)=>{
                return x.data.month == 1
            })
            const T6Cart = T6.map((x)=>{
                return x.data.productCart
            })
            const arr6 = new Array()
            T6Cart.map((x)=>{
                x.map((x1)=>{
                    const find = arr6.find((x2)=>{
                        return x2.product_id == x1.product_id
                    })
                    if(find){
                        const index = arr1.indexOf(find)
                        arr6[index].cart_sl = arr6[index].cart_sl + x1.cart_sl 
                    }else{
                        arr6.push(x1)
                    }

                }) 
            })
            // San pham cua thang 7 
            const T7 = product.filter((x)=>{
                return x.data.month == 1
            })
            const T7Cart = T7.map((x)=>{
                return x.data.productCart
            })
            const arr7 = new Array()
            T7Cart.map((x)=>{
                x.map((x1)=>{
                    const find = arr7.find((x2)=>{
                        return x2.product_id == x1.product_id
                    })
                    if(find){
                        const index = arr1.indexOf(find)
                        arr7[index].cart_sl = arr7[index].cart_sl + x1.cart_sl 
                    }else{
                        arr7.push(x1)
                    }

                }) 
            })
            // San pham cua thang 8
            const T8 = product.filter((x)=>{
                return x.data.month == 1
            })
            const T8Cart = T8.map((x)=>{
                return x.data.productCart
            })
            const arr8 = new Array()
            T8Cart.map((x)=>{
                x.map((x1)=>{
                    const find = arr8.find((x2)=>{
                        return x2.product_id == x1.product_id
                    })
                    if(find){
                        const index = arr1.indexOf(find)
                        arr8[index].cart_sl = arr8[index].cart_sl + x1.cart_sl 
                    }else{
                        arr8.push(x1)
                    }

                }) 
            })
            // San pham thang 11
            const T11 = product.filter((x)=>{
                return x.data.month == 1
            })
            const T11Cart = T11.map((x)=>{
                return x.data.productCart
            })
            const arr11 = new Array()
            T11Cart.map((x)=>{
                x.map((x1)=>{
                    const find = arr11.find((x2)=>{
                        return x2.product_id == x1.product_id
                    })
                    if(find){
                        const index = arr11.indexOf(find)
                        arr11[index].cart_sl = arr11[index].cart_sl + x1.cart_sl 
                    }else{
                        arr11.push(x1)
                    }

                }) 
            })

            // San pham thang 12 
            const T12 = product.filter((x)=>{
                return x.data.month == 1
            })
            const T12Cart = T12.map((x)=>{
                return x.data.productCart
            })
            const arr12 = new Array()
            T12Cart.map((x)=>{
                x.map((x1)=>{
                    const find = arr12.find((x2)=>{
                        return x2.product_id == x1.product_id
                    })
                    if(find){
                        const index = arr12.indexOf(find)
                        arr12[index].cart_sl = arr12[index].cart_sl + x1.cart_sl 
                    }else{
                        arr12.push(x1)
                    }

                }) 
            })
            // San pham cua thang 2
            const T2 = product.filter((x)=>{
                return x.data.month == 1
            })
            const T2Cart = T2.map((x)=>{
                return x.data.productCart
            })
            const arr2 = new Array()
            T2Cart.map((x)=>{
                x.map((x1)=>{
                    const find = arr2.find((x2)=>{
                        return x2.product_id == x1.product_id
                    })
                    if(find){
                        const index = arr1.indexOf(find)
                        arr2[index].cart_sl = arr2[index].cart_sl + x1.cart_sl 
                    }else{
                        arr2.push(x1)
                    }

                }) 
            })
            res.status(200).json({
                arr1 : arr1,
                arr2 : arr2,
                arr3 : arr3,
                arr4 : arr4,
                arr5 : arr5,
                arr6 : arr6,
                arr7 : arr7,
                arr8 : arr8,
                arr9 : arr,
                arr10 : arr10,
                arr11 : arr11,
                arr12 : arr12
            })

        }
    })
})
app.get("/api/thongke/loinhuan/monthInYear/:id",(req,res)=>{
    const id = req.params.id
    const sql = `SELECT order_data,order_date FROM order_product WHERE order_tranpost="Đã nhận hàng"`
    const sql1 = `SELECT * FROM product`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            const value = resuft.filter((x)=>{
                return JSON.parse(x.order_date).success.split('-')[1].split('/')[2] == id
            })
            const product = value.map((x)=>{  
                return {
                    data : {
                       productCart : JSON.parse(x.order_data),
                       month : JSON.parse(x.order_date).success.split('-')[1].split('/')[1]
                    }
                    
                }
            })
            const T9 = product.filter((x)=>{
                return x.data.month == 9
            })
            const T9Cart = T9.map((x)=>{
                return x.data.productCart
            })
            conn.query(sql1,(err,resuft1)=>{
                if(err){
                    res.status(500).json(err)
                }else{
                    const arr = new Array()
                    T9Cart.map((x)=>{
                        x.map((x1)=>{
                            const find = arr.find((x2)=>{
                                return x2.product_id == x1.product_id
                            })
                            if(find){
                                const index = arr.indexOf(find)
                                arr[index].cart_sl = arr[index].cart_sl + x1.cart_sl 
                            }else{
                                arr.push(x1)
                            }
                            
                        }) 
                    })
                    resuft1.forEach((element,index)=>{
                        const find = arr.find((x)=>{
                            return x.product_id == element.id
                        })
                        if(find){
                            arr[index].total = find.cart_price*find.cart_sl
                        }
                    })
                    res.status(200).json(arr)
                }
            })
            
            // Cac san pham cua thang 10s
            // const T10 = product.filter((x)=>{
            //     return x.data.month == 10
            // })
            // const T10Cart = T10.map((x)=>{
            //     return x.data.productCart
            // })
            // const arr10 = new Array()
            // T10Cart.map((x)=>{
            //     x.map((x1)=>{
            //         const find = arr10.find((x2)=>{
            //             return x2.product_id == x1.product_id
            //         })
            //         if(find){
            //             const index = arr10.indexOf(find)
            //             arr10[index].cart_sl = arr10[index].cart_sl + x1.cart_sl 
            //         }else{
            //             arr10.push(x1)
            //         }

            //     }) 
            // })
           
            // // Cac san pham cua thang 1
            // const T1 = product.filter((x)=>{
            //     return x.data.month == 1
            // })
            // const T1Cart = T1.map((x)=>{
            //     return x.data.productCart
            // })
            // const arr1 = new Array()
            // T1Cart.map((x)=>{
            //     x.map((x1)=>{
            //         const find = arr1.find((x2)=>{
            //             return x2.product_id == x1.product_id
            //         })
            //         if(find){
            //             const index = arr1.indexOf(find)
            //             arr1[index].cart_sl = arr1[index].cart_sl + x1.cart_sl 
            //         }else{
            //             arr1.push(x1)
            //         }

            //     }) 
            // })
            // // Cac san pham thang 3
            // const T3 = product.filter((x)=>{
            //     return x.data.month == 1
            // })
            // const T3Cart = T3.map((x)=>{
            //     return x.data.productCart
            // })
            // const arr3 = new Array()
            // T3Cart.map((x)=>{
            //     x.map((x1)=>{
            //         const find = arr3.find((x2)=>{
            //             return x2.product_id == x1.product_id
            //         })
            //         if(find){
            //             const index = arr3.indexOf(find)
            //             arr3[index].cart_sl = arr3[index].cart_sl + x1.cart_sl 
            //         }else{
            //             arr3.push(x1)
            //         }

            //     }) 
            // })
            // // San pham cua thang 4
            // const T4 = product.filter((x)=>{
            //     return x.data.month == 1
            // })
            // const T4Cart = T4.map((x)=>{
            //     return x.data.productCart
            // })
            // const arr4 = new Array()
            // T4Cart.map((x)=>{
            //     x.map((x1)=>{
            //         const find = arr4.find((x2)=>{
            //             return x2.product_id == x1.product_id
            //         })
            //         if(find){
            //             const index = arr4.indexOf(find)
            //             arr4[index].cart_sl = arr4[index].cart_sl + x1.cart_sl 
            //         }else{
            //             arr4.push(x1)
            //         }

            //     }) 
            // })

            // // san pham cua thnag 5
            // const T5 = product.filter((x)=>{
            //     return x.data.month == 1
            // })
            // const T5Cart = T5.map((x)=>{
            //     return x.data.productCart
            // })
            // const arr5 = new Array()
            // T5Cart.map((x)=>{
            //     x.map((x1)=>{
            //         const find = arr5.find((x2)=>{
            //             return x2.product_id == x1.product_id
            //         })
            //         if(find){
            //             const index = arr1.indexOf(find)
            //             arr5[index].cart_sl = arr5[index].cart_sl + x1.cart_sl 
            //         }else{
            //             arr5.push(x1)
            //         }

            //     }) 
            // })
            // // San pham cua thang 6 
            // const T6 = product.filter((x)=>{
            //     return x.data.month == 1
            // })
            // const T6Cart = T6.map((x)=>{
            //     return x.data.productCart
            // })
            // const arr6 = new Array()
            // T6Cart.map((x)=>{
            //     x.map((x1)=>{
            //         const find = arr6.find((x2)=>{
            //             return x2.product_id == x1.product_id
            //         })
            //         if(find){
            //             const index = arr1.indexOf(find)
            //             arr6[index].cart_sl = arr6[index].cart_sl + x1.cart_sl 
            //         }else{
            //             arr6.push(x1)
            //         }

            //     }) 
            // })
            // // San pham cua thang 7 
            // const T7 = product.filter((x)=>{
            //     return x.data.month == 1
            // })
            // const T7Cart = T7.map((x)=>{
            //     return x.data.productCart
            // })
            // const arr7 = new Array()
            // T7Cart.map((x)=>{
            //     x.map((x1)=>{
            //         const find = arr7.find((x2)=>{
            //             return x2.product_id == x1.product_id
            //         })
            //         if(find){
            //             const index = arr1.indexOf(find)
            //             arr7[index].cart_sl = arr7[index].cart_sl + x1.cart_sl 
            //         }else{
            //             arr7.push(x1)
            //         }

            //     }) 
            // })
            // // San pham cua thang 8
            // const T8 = product.filter((x)=>{
            //     return x.data.month == 1
            // })
            // const T8Cart = T8.map((x)=>{
            //     return x.data.productCart
            // })
            // const arr8 = new Array()
            // T8Cart.map((x)=>{
            //     x.map((x1)=>{
            //         const find = arr8.find((x2)=>{
            //             return x2.product_id == x1.product_id
            //         })
            //         if(find){
            //             const index = arr1.indexOf(find)
            //             arr8[index].cart_sl = arr8[index].cart_sl + x1.cart_sl 
            //         }else{
            //             arr8.push(x1)
            //         }

            //     }) 
            // })
            // // San pham thang 11
            // const T11 = product.filter((x)=>{
            //     return x.data.month == 1
            // })
            // const T11Cart = T11.map((x)=>{
            //     return x.data.productCart
            // })
            // const arr11 = new Array()
            // T11Cart.map((x)=>{
            //     x.map((x1)=>{
            //         const find = arr11.find((x2)=>{
            //             return x2.product_id == x1.product_id
            //         })
            //         if(find){
            //             const index = arr11.indexOf(find)
            //             arr11[index].cart_sl = arr11[index].cart_sl + x1.cart_sl 
            //         }else{
            //             arr11.push(x1)
            //         }

            //     }) 
            // })

            // // San pham thang 12 
            // const T12 = product.filter((x)=>{
            //     return x.data.month == 1
            // })
            // const T12Cart = T12.map((x)=>{
            //     return x.data.productCart
            // })
            // const arr12 = new Array()
            // T12Cart.map((x)=>{
            //     x.map((x1)=>{
            //         const find = arr12.find((x2)=>{
            //             return x2.product_id == x1.product_id
            //         })
            //         if(find){
            //             const index = arr12.indexOf(find)
            //             arr12[index].cart_sl = arr12[index].cart_sl + x1.cart_sl 
            //         }else{
            //             arr12.push(x1)
            //         }

            //     }) 
            // })
            // // San pham cua thang 2
            // const T2 = product.filter((x)=>{
            //     return x.data.month == 1
            // })
            // const T2Cart = T2.map((x)=>{
            //     return x.data.productCart
            // })
            // const arr2 = new Array()
            // T2Cart.map((x)=>{
            //     x.map((x1)=>{
            //         const find = arr2.find((x2)=>{
            //             return x2.product_id == x1.product_id
            //         })
            //         if(find){
            //             const index = arr1.indexOf(find)
            //             arr2[index].cart_sl = arr2[index].cart_sl + x1.cart_sl 
            //         }else{
            //             arr2.push(x1)
            //         }

            //     }) 
            // })
            // res.status(200).json(arr)

        }
    })
})

// Commnet 
// Post 
app.post('/api/post/comment/',(req,res)=>{
    const { comment_vote , comment_dis , user_id , product_id , image , time , reply } = req.body
    const sql = `INSERT INTO comment (user_id,comment_vote,comment_dis, product_id , image,time , reply) VALUES ('${user_id}', '${comment_vote}', '${comment_dis}', '${product_id}','${image}','${time}','${reply}')`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            
            res.status(200).json(req.body)
        }
    }) 
}) 
app.get('/api/get/comment/:productId',(req,res)=>{
    const productId = req.params.productId
    const sql = `SELECT user.name , user.image , comment.image as imageC , comment.reply , comment.comment_vote , comment.comment_dis , comment.product_id , comment.id , comment.time FROM user INNER JOIN comment ON user.id = comment.user_id INNER JOIN product ON product.id = comment.product_id WHERE comment.product_id = ${productId}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft)
        }
    })
})

app.get("/api/get/comment/reply/:id",(req,res)=>{
    const id = req.params.id
    const sql = `SELECT reply FROM comment WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            // JSON.parse(resuft)
            res.status(200).json(resuft[0])
        }
    })
})
/// Like Comment 
app.put("/api/put/reply/:id",(req,res)=>{
    const { reply } = req.body;
    const id = req.params.id
    const sql = `UPDATE comment SET reply='${reply}' WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("update thanh cong")
        }
    })
})
// Dang nhap bang facebook

app.post("/api/login/facebook/",(req,res)=>{
    const { name , email , image , faceId } = req.body 
    const sql = `INSERT INTO user ( name , email , image , social_Id ) VALUES ("${name}","${email}","${image}","${faceId}")`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(req.body)
        }
    }) 
})
app.get("/api/getLogin/facebook/:id",(req,res)=>{
    const faceID = req.params.id
    const sql = `SELECT * FROM user WHERE social_Id=${faceID}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json(resuft[0]);
        }
    })
})


app.put(("/api/put/user/:id"),(req,res)=>{
    const id = req.params.id
    const { name , email , image } = req.body
    const sql = `UPDATE user SET name='${name}',email='${email}',image='${image}' WHERE id=${id}`
    conn.query(sql,(err,resuft)=>{
        if(err){
            res.status(500).json(err)
        }else{
            res.status(200).json("Update Thanh Cong")
        }
    })
})

server.listen(3000,()=>{
    console.log("Listening port 3000");
})