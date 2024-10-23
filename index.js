var segments = window.segmentsStore
var depts = {
    visible: false,
    data: {
        map: {},
        totalDept: -1,
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
        //if (w > clientW) {
        //    let s = clientW / w
        //    w *= s
        //    h *= s
        //}
        //if (h > clientH) {
        //    let s = clientH / h
        //    w *= s
        //    h *= s
        //}

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
        mapSwitchBtn.innerText = 'Показать нашу карту'
    } else {
        mapSwitchBtn.innerText = 'Показать кадастровую карту'
    }
}

var uiDiv = document.createElement('div')
uiDiv.style.cssText =
    'position: absolute; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 10px; align-items: flex-end;'
document.body.appendChild(uiDiv)

var searchInput = document.createElement('input')
searchInput.placeholder = "Поиск по номеру"
uiDiv.appendChild(searchInput)

var mapSwitchBtn = document.createElement('button')
mapSwitchBtn.innerText = 'Switch map'
mapSwitchBtn.onclick = switchMap
uiDiv.appendChild(mapSwitchBtn)

switchMap()

function toggleDept(toState) {
    if (toState === undefined) {
        toState = !depts.visible
    }
    depts.visible = toState

    if (depts.visible) {
        deptBtn.innerText = 'Скрыть долги'
    } else {
        deptBtn.innerText = 'Показать долги'
    }
}

var deptBtn = document.createElement('button')
deptBtn.style.display = 'none'
deptBtn.onclick = () => toggleDept()
uiDiv.appendChild(deptBtn)
toggleDept(false)

var fileDiv = document.createElement('div')
fileDiv.style.cssText =
    'display: flex; flex-direction: row; gap: 4px; align-items: center;'
uiDiv.appendChild(fileDiv)
var deptFileName = document.createElement('span')
deptFileName.style.cssText = 'color: #fff;'
fileDiv.appendChild(deptFileName)

var deptFile = document.createElement('input')
deptFile.type = 'file'
deptFile.style.cssText = 'width: 115px;'
fileDiv.appendChild(deptFile)

var deptInfo = document.createElement('div')
deptInfo.style.cssText =
    'display: flex; flex-direction: column; gap: 4px; align-items: center; color: #fff'
uiDiv.appendChild(deptInfo)

var segmentInfo = document.createElement('div')
segmentInfo.style.cssText =
    'position: absolute; top: -999px; left: -999px; display: flex; flex-direction: column; gap: 4px; color: #fff; background: black; border: 2px solid gray; border-radius: 4px; pointer-events: none; padding: 8px;'
document.body.appendChild(segmentInfo)

deptFile.onchange = () => {
	deptBtn.style.display = 'block'
	
    const file = deptFile.files[0]
    deptFileName.innerText = file.name

    file.arrayBuffer().then((ab) => {
        const wb = window.XLSX.read(ab)

        let totalDept = 0

        const fileDepts = {}

        wb.SheetNames.forEach((n) => {
            const ws = wb.Sheets[n]
            const rowSeparator = '__r_s__'
            const fieldSeparator = '__f_s__'
            const csv = XLSX.utils.sheet_to_csv(ws, {
                RS: rowSeparator,
                FS: fieldSeparator,
            })
            if (csv.indexOf('СНТ ""СОТВОРЕНИЕ""') === -1) {
                return
            }

            let segment
            let canParse = false
            const rows = csv.split(rowSeparator)
            rows.forEach((row) => {
                if (!canParse) {
                    canParse = row.startsWith(
                        `Участок${fieldSeparator}Улица${fieldSeparator}Собств`
                    )
                    return
                }

                const cols = row.split(fieldSeparator)
                if (cols.length !== 9) {
                    console.error('csv', csv)

                    console.error('row', row)
                    console.error('cols', cols)

                    throw new Error(
                        'File format changed, we expected 9 columns'
                    )
                }
                if (cols[0]) {
                    if (!segment) {
                        const label = cols.at(3)
                        const neededToPay = parseFloat(cols.at(5))
                        const dept = parseFloat(cols.at(6))

                        segment = {
                            isUnknownOwner: cols.at(2) === '- -',
                            code: cols[0],
                            totalPayed: 0,
                            totalDept: 0,
                            costs: [
                                {
                                    label: label,
                                    value: neededToPay,
                                    dept: dept,
                                },
                            ],
                        }
                    } else if (cols[0] === 'Итого') {
                        if (!segment) {
                            console.error('Parser is broken')
                        } else {
                            const neededToPay = parseFloat(cols.at(5))
                            const dept = parseFloat(cols.at(6))
                            segment.totalPayed = neededToPay - dept
                            segment.totalDept = dept

                            totalDept += segment.totalDept

                            fileDepts[segment.code] = segment
                            segment = undefined
                        }
                    }
                } else if (segment) {
                    const label = cols.at(3)
                    const neededToPay = parseFloat(cols.at(5))
                    const dept = parseFloat(cols.at(6))

                    segment.costs.push({
                        label: label,
                        value: neededToPay,
                        dept: dept,
                    })
                }
            })
        })
        depts.data.map = fileDepts
        depts.data.totalDept = totalDept
        toggleDept(true)

        deptInfo.innerText = `Total dept: ${totalDept}`
    })
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
            if (dist < 4) {
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

const getDeptColor = (value) => {
    const price = 2000
    const month12 = 12 * price
    const month9 = 9 * price
    const month6 = 6 * price
    const month3 = 3 * price

    if (value >= month12) {
        return 'rgba(255, 0, 0, 0.7)'
    } else if (value >= month9) {
        return 'rgba(255, 77, 0, 0.7)'
    } else if (value >= month6) {
        return 'rgba(255, 116, 0, 0.7)'
    } else if (value >= month3) {
        return 'rgba(255, 154, 0, 0.7)'
    } else if (value > 0) {
        return 'rgba(255, 193, 0, 0.7)'
    } else {
        return 'rgba(0, 255, 0, 0.7)'
    }
}

function animate() {
	const searchText = searchInput.value

    let isKadMap = mapImg === mapKadImg

    ctx.font = 'bold 12px Arial'
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    let hoveredSegment

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
                const deptValue = (dept ? dept.totalDept : 0) || 0
                const deptColor = getDeptColor(deptValue)
                ctx.fillStyle = deptColor
            } else if (searchText) {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.7)'
                doFill = true
            }

			if (searchText) {
				if (segment.code.indexOf(searchText) === -1) {
					ctx.globalAlpha = 0.1
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

			ctx.globalAlpha = 1

            if (
                depts.visible &&
                mouseP &&
                pointIsInPoly(mouseP, segment.points)
            ) {
                if (!hoveredSegment) {
                    hoveredSegment = segment

                    ctx.beginPath()
                    ctx.lineWidth = 2
                    ctx.strokeStyle = '#f2ff00'
                    ctx.fillStyle = 'rgba(0, 0, 255, 0.5)'

                    hoveredSegment.points.forEach((p, idx) => {
                        if (idx === 0) {
                            ctx.moveTo(p.x, p.y)
                        } else {
                            ctx.lineTo(p.x, p.y)
                        }
                    })
                    ctx.closePath()
                    ctx.stroke()
                    ctx.fill()
                }
            }

            let w = maxX - minX
            let h = maxY - minY
            let cx = minX - 12 + w / 2
            let cy = minY + 5 + h / 2

            let s = 1
            let r = 0
            let opts = segments.opts[segment.code]
            if (opts) {
                cx += opts.label.x || 0
                cy += opts.label.y || 0
                r = opts.label.rotation || 0
                s = opts.label.scale || 1
            }

            const tm = ctx.measureText(segment.code)

            ctx.beginPath()
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'

            if (r !== 0 || s !== 1) {
                ctx.save()
                ctx.translate(cx, cy)
                ctx.scale(s, s)

                ctx.rotate(r)
                cx = opts.label.x || 0
                cy = opts.label.y || 0
            }

            ctx.fillRect(cx - 2, cy - 11, tm.width + 4, 14)

            ctx.fillStyle = '#000'
            ctx.fillText(segment.code, cx, cy)

            if (r) {
                ctx.restore()
            }
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

        if (depts.visible) {
            if (depts.data.totalDept >= 0) {
                ctx.beginPath()
                ctx.fillStyle = '#fff'
                ctx.font = '20px Arial'
                const deptsText = `Всего долгов: ${depts.data.totalDept.toLocaleString()}`
                const w = ctx.measureText(deptsText).width
                ctx.fillText(deptsText, ctx.canvas.width - w - 10, 30)
            }
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

    if (hoveredSegment && depts.visible) {
        if (segmentInfo._segmentCode !== hoveredSegment.code) {
            let dept = depts.data.map[hoveredSegment.code]
            segmentInfo.innerHTML = `
<span>
	Участок: ${hoveredSegment.code}
</span>
<div>
	Начисления:
	<div>${
        dept
            ? dept.costs
                  .map((c) => `${c.label}: ${c.value}`)
                  .join('</div><div>')
            : 'отсутствуют'
    }
    </div>
</div>
<span>
	Начислено всего: ${dept ? dept.totalDept + dept.totalPayed : '0'}
</span>
<span>
	Оплачено всего: ${dept ? dept.totalPayed : '0'}
</span>
<span>
	Долг: ${dept ? dept.totalDept : '0'}
</span>
`
        }
        segmentInfo.style.left = `${mouseP.x}px`
        segmentInfo.style.top = `${mouseP.y}px`
    } else {
        segmentInfo.style.left = `-999px`
        segmentInfo.style.top = `-999px`
        segmentInfo._segmentCode = undefined
        segmentInfo.innerHTML = ''
    }

    requestAnimationFrame(animate)
}

requestAnimationFrame(animate)

// NOTE: taken from here https://stackoverflow.com/questions/217578/how-can-i-determine-whether-a-2d-point-is-within-a-polygon/17490923#17490923
function pointIsInPoly(p, polygon) {
    var isInside = false
    var minX = polygon[0].x
    var maxX = polygon[0].x
    var minY = polygon[0].y
    var maxY = polygon[0].y
    for (var n = 1; n < polygon.length; n++) {
        var q = polygon[n]
        minX = Math.min(q.x, minX)
        maxX = Math.max(q.x, maxX)
        minY = Math.min(q.y, minY)
        maxY = Math.max(q.y, maxY)
    }

    if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
        return false
    }

    var i = 0
    var j = polygon.length - 1
    for (i, j; i < polygon.length; j = i++) {
        if (
            polygon[i].y > p.y != polygon[j].y > p.y &&
            p.x <
                ((polygon[j].x - polygon[i].x) * (p.y - polygon[i].y)) /
                    (polygon[j].y - polygon[i].y) +
                    polygon[i].x
        ) {
            isInside = !isInside
        }
    }

    return isInside
}
