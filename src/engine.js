let canvasHeight = 720;
let canvasWidth = 1280;

//let mapHeight = 0;
//let mapWidth = 0;

let tilesCube = 50;

const FOV = 60;
const halfFOV = FOV / 2;
const FPS = 60;

let tileTexture;

class Level{ //@ Clase Level (Carga e instancia el nievel)

    wall = '#000000';
    floor = '#666666';
    

    constructor(canvas, ctx, array){
        this.canvas = canvas;
        this.ctx = ctx;
        this.matrix = array;

        this.matrixWidth = this.matrix.length;
        this.matrixHeight = this.matrix[0].length;

        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;

        this.mapWidth = this.matrixWidth * tilesCube;
        this.mapHeight = this.matrixHeight * tilesCube;

        this.tilesWidth = parseInt(this.mapWidth / this.matrixWidth);
        this.tilesHeight = parseInt(this.mapHeight / this.matrixHeight);
        
    }

    tileMatrix(x, y){
        let xMatrix =  this.tilesWidth;
        let yMatrix = this.tilesHeight;
        let id = this.matrix[xMatrix, yMatrix];

        return id;
    }

    collider(x, y){
        let collide = false;
        if (this.matrix[y][x] !== 0) 
            collide = true;
        return collide;
    }

    renderDebug(scale){
        let color;
    
        for (let y = 0; y < this.matrixWidth; y++){
            for (let x = 0; x < this.matrixHeight; x++){
                if (this.matrix[y][x]!=0)
                    color = this.wall;
                else
                    color = this.floor;

                this.ctx.fillStyle = color;


                this.ctx.fillRect(x * (this.tilesHeight*scale), y * (this.tilesWidth * scale), (this.tilesHeight*scale), (this.tilesWidth * scale));
                //this.ctx.fillRect(x * this.tilesHeight, y * this.tilesWidth, this.tilesHeight, this.tilesWidth);
            }
        }
    }
};


class Player{ //@ Clase Player (Instancia el jugador y le da atributos)

    playerColor = '#FFFFFF';

    constructor(ctx, level, x, y){
        this.ctx = ctx;
        this.level = level;

        this.x = x;
        this.y = y;

        this.speed = 0;
        this.rotate = 0;

        this.angle = 0;

        this.moveSpeed = 2;
        this.turnSpeed = 2 * (Math.PI / 180);

        //# Raycast
        this.rayCount = canvasWidth;
        this.ray = [];

        let increseAngle = toRadians(FOV / this.rayCount);
        let initialAngle = toRadians(this.angle - halfFOV);

        var rayAngle = initialAngle;
        
        for(let i = 0; i <this.rayCount; i++){
            this.ray[i] = new Ray(this.ctx, this.level, this.x, this.y, this.angle, rayAngle);
            rayAngle += increseAngle;
        }

    }

    moveForward(){
        this.speed = 1;
    }
    moveBackward(){
        this.speed = -1;
    }
    moveStop(){
        this.speed = 0;
    }
    turnLeft(){
        this.rotate = -1;
    }
    turnRight(){
        this.rotate = 1;
    }
    turnStop(){
        this.rotate = 0;
    }

    moveUpdate(){
        let newX = this.x + (this.speed * Math.cos(this.angle) * this.moveSpeed);
        let newY = this.y + (this.speed * Math.sin(this.angle) * this.moveSpeed);

        let colX = this.x + (this.speed * Math.cos(this.angle) * (this.moveSpeed + 15));
        let colY = this.y + (this.speed * Math.sin(this.angle) * (this.moveSpeed + 15));

        //if (!this.collider(newX, newY)){
        if (!this.collider(colX, colY)){
            this.x = newX;
            this.y = newY;
        }

        this.angle += this.rotate * this.turnSpeed;
        this.angle = normalizeAngle(this.angle);

        // Ray Update
        for(let i = 0; i < this.rayCount; i++){
            this.ray[i].x = this.x;
            this.ray[i].y = this.y;
            this.ray[i].setAngel(this.angle);
            this.ray[i].column = i;
        }
    }

    collider(x, y){
        let collide = false;
        
        //let xCollider = Math.round(x / this.level.tilesWidth);
        //let yCollider = Math.round(y / this.level.tilesHeight);

        let xCollider = parseInt(x / this.level.tilesWidth);
        let yCollider = parseInt(y / this.level.tilesHeight);

        if(this.level.collider(xCollider, yCollider)) collide = true;

        return collide;
    }

    render(){
        this.moveUpdate();
        for(let i = 0; i < this.rayCount; i++){
            this.ray[i].florRender();
            this.ray[i].wallRender(); 
        }
    }
    
    renderDebug(sacle){
        let scale = sacle;
        this.moveUpdate();
        this.ctx.fillStyle = this.playerColor;
        this.ctx.fillRect((this.x -5) * scale, (this.y -5) * scale, 10 * scale, 10 * scale);

        var xArrow = this.x + Math.cos(this.angle) * 40;
        var yArrow = this.y + Math.sin(this.angle) * 40;

        //! Debug
        //Raycast
        for(let i = 0; i < this.rayCount; i++){
            this.ray[i].draw(scale);
        }

        //Direccion
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.x * scale, this.y  * scale);
        this.ctx.lineTo(xArrow * scale , yArrow * scale );
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(this.x  * scale, this.y  * scale);
        this.ctx.lineTo(xArrow * scale , this.y  * scale);
        this.ctx.strokeStyle = '#0000FF';
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(this.x  * scale, this.y  * scale);
        this.ctx.lineTo(this.x  * scale, yArrow * scale );
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.stroke();
        
    }
}

class Ray{ //@ Clase Ray (Ray tracing para dibujar las paredes)
    column = 0
    constructor(ctx, level, x, y, angle, turnSpeed, column){
        this.ctx = ctx;
        this.level = level;
        this.x = x;
        this.y = y;
        this.playerAngle = angle;
        this.angle = angle;
        this.turnSpeed = turnSpeed;
        this.column = column;
        this.distance = 0;
        this.tile = tilesCube;

        this.wallHitX = 0;
        this.wallHitY = 0;

        this.wallHitXV = 0;
        this.wallHitYH = 0;
        this.wallHitYV = 0;
        this.wallHitYH = 0;

        this.floorHitXV = 0;
        this.floorHitYH = 0;
        this.floorHitYV = 0;
        this.floorHitYH = 0;

        this.wallColor = '#666666';

        this.pixelTexture = 0;
        this.idTexture = 1;
    }

    setAngel(angle){
        this.playerAngle = angle;
        this.angle = normalizeAngle(angle + this.turnSpeed);
    }

    cast(){
        this.xIntersec = 0;
        this.yIntersec = 0;

        this.hHit = false;
        this.vHit = false;

        this.xStep = 0;
        this.yStep = 0;

        this.down = false;
        this.left = false;


        //# Orientiacion del angulo del jugador
        if (this.angle < Math.PI)
            this.down = true;

        if (this.angle > Math.PI/2 && this.angle < 3 * Math.PI/2)
            this.left = true;

        //# Colision del Rayo Horizontal
        this.yIntersec = Math.floor(this.y / tilesCube) *  tilesCube;
        if (this.down)
            this.yIntersec += tilesCube;

        let adjacent = (this.yIntersec - this.y) / Math.tan(this.angle);
        this.xIntersec = this.x + adjacent;

        this.yStep = tilesCube;
        this.xStep = this.yStep / Math.tan(this.angle);

        if(!this.down)
            this.yStep = -this.yStep;
        if((this.left && this.xStep >0) || (!this.left && this.xStep <0))
            this.xStep = - this.xStep;

        let nextXH = this.xIntersec;
        let nextYH = this.yIntersec;

        if (!this.down) // Previente falsa colision en matriz
            nextYH = nextYH - 1;

        while (!this.hHit){

            let tiltX = parseInt(nextXH / tilesCube);
            let tiltY = parseInt(nextYH / tilesCube);

            if (this.level.collider(tiltX, tiltY)){
                this.hHit = true;
                this.wallHitXH = nextXH;
                this.wallHitYH = nextYH;
            }else{
                nextXH += this.xStep;
                nextYH += this.yStep;
            }
        }

        //# Colision del Rayo Vetical

        this.xIntersec = Math.floor(this.x / tilesCube) * tilesCube;
        if (!this.left)
            this.xIntersec += tilesCube;

        let opposite = (this.xIntersec - this.x) * Math.tan(this.angle);
        this.yIntersec = this.y + opposite;

        this.xStep = tilesCube;
        if (this.left)
            this.xStep = -this.xStep;
        
        this.yStep = tilesCube * Math.tan(this.angle);
        if ((!this.down && this.yStep > 0) || (this.down && this.yStep < 0))
            this.yStep = -this.yStep;
        
        let nextXV = this.xIntersec;
        let nextYV = this.yIntersec;
    
        if (this.left) // Previente falsa colision en matriz
            nextXV = nextXV - 1;
        
        //while (!this.vHit && (nextXV >= 0 && nextYV >= 0 && nextXV <= this.level.mapWidth && nextYV <= this.level.mapHeight)){
        while (!this.vHit ){

            if (nextXV<0) nextXV = 0;
            if (nextYV<0) nextYV = 0;

            if (nextXV>this.level.mapWidth) nextXV = this.level.mapWidth-1;
            if (nextYV>this.level.mapHeight) nextYV = this.level.mapHeight-1;

            let tiltX = parseInt(nextXV / tilesCube);
            let tiltY = parseInt(nextYV / tilesCube);

            if(this.level.collider(tiltX, tiltY)){
                this.vHit = true;
                this.wallHitXV = nextXV;
                this.wallHitYV = nextYV;
            }else{

                nextXV += this.xStep;
                nextYV += this.yStep;
            }
        }

        
        //# Actulaizar punto de colision
        let vDistance = 999999;
        let hDistance = 999999;

        if(this.hHit)
            hDistance = getDistance(this.x, this.y, this.wallHitXH, this.wallHitYH);
        if(this.hHit)
            vDistance = getDistance(this.x, this.y, this.wallHitXV, this.wallHitYV);

        if(vDistance > hDistance){ 
            this.wallHitX = this.wallHitXH;
            this.wallHitY = this.wallHitYH;
            this.distance = hDistance;

            let hexString = Math.round(this.distance * .6);
            if (hexString > 255 ) hexString = 255;
            if (hexString < 50 ) hexString = 50;
            hexString = hexString.toString(16)
            this.wallColor = '#000000'+hexString;

            var mod = parseInt(this.wallHitX/this.tile);
            this.pixelTexture = this.wallHitX - (mod * this.tile);
        }else{
            this.wallHitX = this.wallHitXV;
            this.wallHitY = this.wallHitYV;
            this.distance = vDistance;

            let hexString = Math.round(this.distance * .6);
            if (hexString > 255 ) hexString = 255;
            if (hexString < 50 ) hexString = 50;
            hexString = hexString.toString(16)
            this.wallColor = '#050505'+hexString;

            var mod = parseInt(this.wallHitY/this.tile);
            this.pixelTexture = this.wallHitY - (mod * this.tile);

        }

        let tiltX = parseInt(this.wallHitX / tilesCube);
        let tiltY = parseInt(this.wallHitY / tilesCube);

        this.idTexture = this.level.matrix[tiltY][tiltX];

        this.distance = this.distance * Math.cos(this.playerAngle - this.angle); 
    }

    wallRender(){
        this.cast();
        let tileHigh = 500;
        let proyectionDistance = (canvasWidth/2) / Math.tan(halfFOV);
        let heightWall = (tileHigh / this.distance) * proyectionDistance;

        let y0 = parseInt(canvasHeight / 2) - parseInt(heightWall / 2);
        let y1 = y0 + heightWall;
        let x = this.column;

        //# Texture Render
        let textureHeight = 256; // px
        let imageHeight = y0 - y1; // px

        

        this.pixelTexture = this.pixelTexture * ( textureHeight / tilesCube);
        // /*
        this.ctx.drawImage(
            tileTexture,                                // texture
            this.pixelTexture,                          // x clipping
            textureHeight * ( this.idTexture -1),       // y clipping
            1,                                          // width clipping
            textureHeight,                              // height clipping
            x,                                          // x offset
            y1,                                         // y offset
            1,                                          // real width
            imageHeight                                 // real height
        );
        // */
        
        //# Line Render and light
        this.ctx.fillStyle = this.wallColor;
        this.ctx.fillRect(x, y0, 1, heightWall);    
    }

    florRender(){
        this.cast();
        let tileHigh = 500;
        let proyectionDistance = (canvasWidth/2) / Math.tan(halfFOV);
        let heightWall = (tileHigh / this.distance) * proyectionDistance;

        let y0 = parseInt(canvasHeight / 2) - parseInt(heightWall / 2);
        let y1 = y0 - heightWall;
        let x = this.column;

        
        //# Line Render
        let Gradient = this.ctx.createLinearGradient(x, y1, 0, heightWall);
        Gradient.addColorStop(1, "#00000088");
        Gradient.addColorStop(0, "#00000000");
        this.ctx.fillStyle = Gradient;//this.wallColor;
        this.ctx.fillRect(x, y1, 1, heightWall);  
    }

    draw(scale){
        this.cast();
        
        //! Debug

        let xDest = this.wallHitX;
        let yDest = this.wallHitY;

        this.ctx.beginPath();
        this.ctx.moveTo(this.x * scale , this.y * scale );
        this.ctx.lineTo(xDest * scale , yDest * scale );
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.stroke();
    }
}


class Engine{ //@ Clase Engiene (Clase principal del juego, control de frame, e instacia del resto de objetos)
    canvas;
    ctx;
    tiles;

    levelOne = [
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,0,0,0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,0,2,0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,0,2,0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,0,2,0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,0,2,0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,0,2,0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,0,2,0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,0,2,0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,0,2,0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,2,2,0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,3,0,0,1,0,0,3,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [2,0,0,1,0,0,0,1,0,0,3,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [2,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,3,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,3,3,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [3,0,0,0,0,0,0,1,0,0,3,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [3,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [3,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,3,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,0,0,0,1,0,0,3,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,0,0,0,1,0,0,0,0,0,1,2,2,2,2,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,3,0,0,1,0,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,1,2,2,2,2,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,1,3,3,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        
        
    ];

    level;
    player;

    constructor(){
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;

        this.level = new Level(this.canvas, this.ctx, this.levelOne);
        this.player = new Player(this.ctx, this.level, 100, 700)
    }

    input(){
        document.addEventListener('keydown', function(key){
    
            if (key.code === 'ArrowUp' || key.code === 'KeyW') engine.player.moveForward();
            else if (key.code === 'ArrowDown' || key.code === 'KeyS') engine.player.moveBackward();

            if (key.code === 'ArrowLeft' || key.code === 'KeyA') engine.player.turnLeft();
            else if (key.code === 'ArrowRight' || key.code === 'KeyD') engine.player.turnRight();
        });
        document.addEventListener('keyup', function(key){
            if (key.code === 'ArrowUp' || key.code === 'KeyW') engine.player.moveStop();
            if (key.code === 'ArrowDown' || key.code === 'KeyS') engine.player.moveStop();

            if (key.code === 'ArrowLeft' || key.code === 'KeyA') engine.player.turnStop();
            if (key.code === 'ArrowRight' || key.code === 'KeyD') engine.player.turnStop();
        });
    }

    boxRender(){

        let roofGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height / 2);
        roofGradient.addColorStop(0, "#134313");
        roofGradient.addColorStop(.9, "#000000");
        roofGradient.addColorStop(1, "#000000");


        this.ctx.fillStyle = roofGradient; // '#232323';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height / 2);

        let floorGradient = this.ctx.createLinearGradient(0, this.canvas.height / 2, 0, this.canvas.height);
        floorGradient.addColorStop(0, "#000000");
        floorGradient.addColorStop(.1, "#000000");
        floorGradient.addColorStop(1, "#323232");

        this.ctx.fillStyle = floorGradient; //'#121212';
        this.ctx.fillRect(0, this.canvas.height / 2, this.canvas.width, this.canvas.height);
    }

    clearCanvas(){
        //this.canvas.width = this.canvas.width;
        //this.canvas.height = this.canvas.height;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    gameLoop(){
        this.clearCanvas();
        this.boxRender();
        this.player.render();
        this.level.renderDebug(0.1);
        this.player.renderDebug(0.1);
    }

}

//% Funcion para normalizar algulos en radianes.
function normalizeAngle(angle){ 
    angle = angle % (2 * Math.PI);
    if (angle < 0) angle += (2 * Math.PI);
    return angle;
}

//% Funcion para calcular la distancia entre puntos.
function getDistance(x1, y1, x2, y2){ 
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}
//% Funcion para convertir a radianes.
function toRadians(angle){ 
    angle = angle * (Math.PI / 180);
    return angle;
}

//% Inicio del Loop principal
let engine
function initialize(){
    engine = new Engine();
    engine.input();
    setInterval(function(){ engine.gameLoop(); }, 1000 / FPS);

    tileTexture = new Image();
    tileTexture.src = 'assets/walls.png';
}
initialize();
