var segments = window.segmentsStore
var depts = {
    visible: false,
    data: {
        map: {},
    },
}

var canvas = document.createElement('canvas')
document.body.appendChild(canvas)

var ctx = canvas.getContext('2d')
let mapKadImg = {
    img: null,
    loaded: false,
    path: './map-kad.png',
    opts: { x: 0, y: 0 },
}
let mapCleanImg = {
    img: null,
    loaded: false,
    path: './map.png',
    opts: { x: 1, y: 1 },
}
let mapImg = mapKadImg

var onResize = () => {
    const clientW = document.body.clientWidth
    const clientH = document.body.clientHeight

    if (mapImg.loaded) {
        let w = mapImg.img.width
        let h = mapImg.img.height
        if (w > clientW) {
            let s = clientW / w
            w *= s
            h *= s
        }
        if (h > clientH) {
            let s = clientH / h
            w *= s
            h *= s
        }

        canvas.width = w
        canvas.height = h
    } else {
        canvas.width = clientW
        canvas.height = clientH
    }
}

window.addEventListener('resize', () => {
    onResize()
})
onResize()

function loadBackground(params) {
    if (!params.img) {
        var img = new Image()
        img.src = params.path
        img.onload = () => {
            canvas.width = img.width
            canvas.height = img.height
            params.loaded = true
            onResize()
        }
        params.img = img
    } else if (params.loaded) {
        onResize()
    }
}

function switchMap() {
    if (mapImg === mapCleanImg) {
        mapImg = mapKadImg
        loadBackground(mapImg)
    } else {
        mapImg = mapCleanImg
        loadBackground(mapImg)
    }

    if (mapImg === mapKadImg) {
        mapSwitchBtn.innerText = 'Show our map'
    } else {
        mapSwitchBtn.innerText = 'Show kadastr map'
    }
}

var mapSwitchBtn = document.createElement('button')
mapSwitchBtn.innerText = 'Switch map'
mapSwitchBtn.onclick = switchMap
mapSwitchBtn.style.cssText = 'position: absolute; top: 10px; right: 10px;'
document.body.appendChild(mapSwitchBtn)

switchMap()

function toggleDept(toState) {
    if (toState === undefined) {
        toState = !depts.visible
    }
    depts.visible = toState

    if (depts.visible) {
        deptBtn.innerText = 'Hide dept'
    } else {
        deptBtn.innerText = 'Show dept'
    }
}

var deptBtn = document.createElement('button')
deptBtn.innerText = 'Show dept'
deptBtn.onclick = () => toggleDept()
deptBtn.style.cssText = 'position: absolute; top: 40px; right: 10px;'
document.body.appendChild(deptBtn)

var fileDiv = document.createElement('div')
fileDiv.style.cssText =
    'position: absolute; top: 70px; right: 10px; display: flex; flex-direction: row; gap: 4px; align-items: center;'
document.body.appendChild(fileDiv)
var deptFileName = document.createElement('span')
deptFileName.style.cssText = 'color: #fff;'
fileDiv.appendChild(deptFileName)

var deptFile = document.createElement('input')
deptFile.type = 'file'
deptFile.accept = '.csv'
deptFile.style.cssText = 'width: 115px;'
fileDiv.appendChild(deptFile)

deptFile.onchange = () => {
    const file = deptFile.files[0]
    deptFileName.innerText = file.name

    var reader = new FileReader()
    reader.readAsText(file, 'UTF-8')
    reader.onload = function (evt) {
        console.log('contents loaded', evt.target.result)

        depts.data.map = {}
        toggleDept(true)

        const contents = evt.target.result
        const rows = contents.split('\n')
        rows.forEach((row) => {
            const cols = row.split(',')
            const code = cols[0]
            const deptVal = parseFloat(cols[1])
            if (Number.isNaN(deptVal)) {
                console.warn(
                    'failed to parse that row, dept is not a number?',
                    row
                )
                return
            }

            const hasSegment = !!segments.map[code]
            if (!hasSegment) {
                console.warn(
                    'failed to parse that row, no segment with that code on the map',
                    row
                )
                return
            }

            depts.data.map[code] = {
                dept: deptVal,
            }
        })
    }
    reader.onerror = function (evt) {
        console.error('failed to read the file', evt)
        alert('Failed to read the file')
    }
}

window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
        if (newSegment) {
            newSegment.points.length -= 1
            if (!newSegment.points.length) {
                newSegment = undefined
            }
        }
    }
})

var newSegment
var mouseP
canvas.addEventListener('click', (e) => {
    if (mapImg === mapKadImg) {
        if (!newSegment) {
            newSegment = {
                points: [],
                code: '',
            }
        }

        let newP = {
            x: e.clientX,
            y: e.clientY,
        }
        let firstP = newSegment.points[0]
        if (firstP) {
            let dx = newP.x - firstP.x
            let dy = newP.y - firstP.y
            let dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 10) {
                let code = window.prompt('Enter segment name: ')
                if (code) {
                    newSegment.code = code
                    segments.add(newSegment)
                    newSegment = undefined
                } else {
                    alert('Cannot create the segment without the name')
                }
            } else {
                newSegment.points.push(newP)
            }
        } else {
            newSegment.points.push(newP)
        }
    }
})
canvas.addEventListener('mousemove', (e) => {
    if (!mouseP) {
        mouseP = {}
    }
    mouseP.x = e.clientX
    mouseP.y = e.clientY
})

function animate() {
    let isKadMap = mapImg === mapKadImg

    ctx.font = 'bold 12px Arial'
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (mapImg.loaded) {
        ctx.drawImage(
            mapImg.img,
            mapImg.opts.x,
            mapImg.opts.y,
            canvas.width,
            canvas.height
        )

        segments.list.forEach((segment) => {
            ctx.beginPath()
            ctx.lineWidth = 2
            ctx.strokeStyle = '#f2ff00'

            let doFill = false
            if (isKadMap) {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
                doFill = true
            } else if (depts.visible) {
                doFill = true
                let dept = depts.data.map[segment.code]
                let value = dept ? dept.dept : undefined
                if (value === undefined) {
                    ctx.fillStyle = 'gray'
                } else if (value > 5000) {
                    ctx.fillStyle = 'red'
                } else if (value > 2000) {
                    ctx.fillStyle = 'orange'
                } else if (value > 100) {
                    ctx.fillStyle = 'yellow'
                } else {
                    ctx.fillStyle = 'green'
                }
            }

            let minX = Number.POSITIVE_INFINITY
            let minY = Number.POSITIVE_INFINITY
            let maxX = Number.NEGATIVE_INFINITY
            let maxY = Number.NEGATIVE_INFINITY

            segment.points.forEach((p, idx) => {
                minX = Math.min(p.x, minX)
                maxX = Math.max(p.x, maxX)
                minY = Math.min(p.y, minY)
                maxY = Math.max(p.y, maxY)

                if (idx === 0) {
                    ctx.moveTo(p.x, p.y)
                } else {
                    ctx.lineTo(p.x, p.y)
                }
            })
            ctx.closePath()
            ctx.stroke()
            if (doFill) {
                ctx.fill()
            }

            let offset = segments.opts[segment.code] || {
                label: { x: 0, y: 0 },
            }
            let w = maxX - minX
            let h = maxY - minY
            let cx = minX - 12 + w / 2 + offset.label.x
            let cy = minY + 5 + h / 2 + offset.label.y

            const tm = ctx.measureText(segment.code)

            ctx.beginPath()
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
            ctx.fillRect(cx - 2, cy - 11, tm.width + 4, 14)

            ctx.fillStyle = '#000'
            ctx.fillText(segment.code, cx, cy)
        })

        if (newSegment) {
            ctx.beginPath()
            ctx.lineWidth = 2
            ctx.strokeStyle = '#000000'

            newSegment.points.forEach((p, idx) => {
                if (idx === 0) {
                    ctx.moveTo(p.x, p.y)
                } else {
                    ctx.lineTo(p.x, p.y)
                }
            })

            if (mouseP) {
                ctx.lineTo(mouseP.x, mouseP.y)
            }

            ctx.stroke()
        }

        if (mouseP) {
            ctx.beginPath()
            ctx.fillStyle = '#ff0000'
            ctx.fillRect(mouseP.x - 3, mouseP.y - 3, 6, 6)
        }
    } else {
        ctx.beginPath()
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    requestAnimationFrame(animate)
}

requestAnimationFrame(animate)