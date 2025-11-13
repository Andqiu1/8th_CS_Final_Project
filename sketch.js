let allData = [];
let filteredData = [];
let compareData = [];
let table;
let margin = { top: 100, right: 60, bottom: 80, left: 80 };
let plotWidth, plotHeight;
let minX, maxX, minY, maxY;
let hoveredPoint = null, hoveredComparePoint = null;
let mouseInPlot = false;
let locationDropdown, compareDropdown;
let searchInput, compareSearchInput;
let allLocations = [];
let selectedLocation = 'World';
let selectedCompare = null;
let hoveringPointX, hoveringPointY;
let hoveringCompareX, hoveringCompareY;
let waveOffset = 0;

function preload() {
  table = loadTable('Sea_Levels_NOAA.csv', 'csv', 'header');
}

function setup() {
  createCanvas(1300, 700);
  plotWidth = width - 100 - margin.left - margin.right;
  plotHeight = height - margin.top - margin.bottom;

  for (let i = 0; i < table.getRowCount(); i++) {
    let tRow = table.getRow(i);
    allData.push({
      id: tRow.getNum('ObjectId'),
      measure: tRow.getString('Measure'),
      date: tRow.getString('Date'),
      change: tRow.getNum('Change in Mean (mm)')
    });
  }

  let locationSet = new Set([
    'World', 'Adriatic Sea', 'Andaman Sea', 'Arabian Sea', 'Atlantic Ocean', 
    'Baltic Sea', 'Bay Bengal', 'Bering Sea', 'Caribbean Sea', 'Gulf Mexico', 
    'Indian Ocean', 'Indonesian', 'Mediterranean', 'Nino', 'North Atlantic', 
    'North Pacific', 'North Sea', 'Pacific Ocean', 'Persian Gulf', 'Sea Japan',
    'Sea Okhotsk', 'South China', 'Southern Ocean', 'Tropics', 'Yellow Sea'
  ]);

  let locationsArray = Array.from(locationSet);
  locationsArray = locationsArray.filter(l => l.toLowerCase() !== "world");
  locationsArray = locationsArray.sort();
  allLocations = ["World", ...locationsArray];

  searchInput = createInput('');
  searchInput.position(20, 20);
  searchInput.size(200);
  searchInput.attribute('placeholder', 'Search location...');
  searchInput.input(filterLocations);

  locationDropdown = createSelect();
  locationDropdown.position(230, 20);
  locationDropdown.size(250);
  updateDropdownOptions(locationDropdown, allLocations, selectedLocation);
  locationDropdown.changed(updateLocation);

  compareSearchInput = createInput('');
  compareSearchInput.position(500, 20);
  compareSearchInput.size(200);
  compareSearchInput.attribute('placeholder', 'Search comparison...');
  compareSearchInput.input(filterCompareLocations);

  compareDropdown = createSelect();
  compareDropdown.position(710, 20);
  compareDropdown.size(250);
  updateDropdownOptions(compareDropdown, ['None', ...allLocations.filter(l => l !== selectedLocation)], selectedCompare || 'None');
  compareDropdown.changed(updateCompare);

  filteredData = allData.filter(d => d.measure === selectedLocation);
  compareData = [];
  calculateBounds();
}

function filterLocations() {
  let searchTerm = searchInput.value().toLowerCase();
  let filtered = allLocations.filter(loc => loc.toLowerCase().includes(searchTerm));
  updateDropdownOptions(locationDropdown, filtered, selectedLocation);
}

function filterCompareLocations() {
  let searchTerm = compareSearchInput.value().toLowerCase();
  let filtered = ['None', ...allLocations.filter(loc =>
    loc.toLowerCase().includes(searchTerm) && loc !== selectedLocation)];
  updateDropdownOptions(compareDropdown, filtered, selectedCompare || 'None');
}

function updateDropdownOptions(dropdown, locations, selected) {
  dropdown.html('');
  for (let loc of locations) {
    dropdown.option(loc);
  }
  if (locations.includes(selected)) {
    dropdown.value(selected);
  } else if (dropdown === compareDropdown && locations.length > 0) {
    dropdown.value('None');
  }
}

function updateLocation() {
  selectedLocation = locationDropdown.value();
  let compareOptions = ['None', ...allLocations.filter(l => l !== selectedLocation)];
  updateDropdownOptions(compareDropdown, compareOptions, selectedCompare || 'None');
  filteredData = allData.filter(d => d.measure === selectedLocation);
  calculateBounds();
}

function updateCompare() {
  selectedCompare = compareDropdown.value();
  if (selectedCompare === 'None') {
    compareData = [];
  } else {
    compareData = allData.filter(d => d.measure === selectedCompare);
  }
  calculateBounds();
}

function calculateBounds() {
  let ranges = [];
  if (filteredData.length > 0) ranges.push(filteredData);
  if (compareData.length > 0) ranges.push(compareData);

  if (ranges.length === 0) return;

  minX = 0;
  maxX = Math.max(filteredData.length, compareData.length) - 1;

  let allY = [];
  ranges.forEach(set => allY = allY.concat(set.map(d => d.change)));
  minY = min(allY);
  maxY = max(allY);

  let yPadding = (maxY - minY) * 0.1;
  minY -= yPadding;
  maxY += yPadding;
}

function parseDate(dateStr) {
  if (dateStr.startsWith('D')) {
    dateStr = dateStr.slice(1);
  }
  let parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  }
  return null;
}

function draw() {
  background(255);

  if (allData.length === 0) {
    fill(100);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('Please load a CSV file with the correct format', width / 2, height / 2);
    return;
  }

  if (filteredData.length === 0) {
    fill(100);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('No data available for selected location', width / 2, height / 2);
    return;
  }

  push();
  translate(margin.left, margin.top);

  drawAxes();

  let mx = mouseX - margin.left;
  let my = mouseY - margin.top;
  mouseInPlot = mx >= 0 && mx <= plotWidth && my >= 0 && my <= plotHeight;

  hoveredPoint = null;
  hoveredComparePoint = null;
  hoveringPointX = undefined;
  hoveringPointY = undefined;
  hoveringCompareX = undefined;
  hoveringCompareY = undefined;

  if (mouseInPlot) {
    let xIndex = Math.round(map(mx, 0, plotWidth, minX, maxX));
    xIndex = constrain(xIndex, 0, maxX);

    let mainPoint = xIndex < filteredData.length ? filteredData[xIndex] : null;
    let comparePoint = (compareData.length > 0 && xIndex < compareData.length) ? compareData[xIndex] : null;
    hoveredPoint = mainPoint;
    hoveredComparePoint = comparePoint;

    let lineX = map(xIndex, minX, maxX, 0, plotWidth);
    stroke(100, 100, 255, 150);
    strokeWeight(1);
    drawingContext.setLineDash([5, 5]);
    line(lineX, 0, lineX, plotHeight);
    drawingContext.setLineDash([]);
  }

  for (let i = 0; i < filteredData.length; i++) {
    let x = map(i, minX, maxX, 0, plotWidth);
    let y = map(filteredData[i].change, minY, maxY, plotHeight, 0);

    if (compareData.length > 0) {
      if (hoveredPoint && filteredData[i].id === hoveredPoint.id) {
        hoveringPointX = x;
        hoveringPointY = y;
      } else {
        fill(255, 0, 0, 120);
        noStroke();
        circle(x, y, 4);
      }
    } else {
      if (hoveredPoint && filteredData[i].id === hoveredPoint.id) {
        hoveringPointX = x;
        hoveringPointY = y;
      } else {
        fill(127.5 + filteredData[i].change, 0, 127.5 - filteredData[i].change, 75);
        noStroke();
        circle(x, y, 4);
      }
    }
  }

  if (compareData.length > 0) {
    for (let i = 0; i < compareData.length; i++) {
      let x = map(i, minX, maxX, 0, plotWidth);
      let y = map(compareData[i].change, minY, maxY, plotHeight, 0);
      if (hoveredComparePoint && compareData[i].id === hoveredComparePoint.id) {
        hoveringCompareX = x;
        hoveringCompareY = y;
      } else {
        fill(20, 200, 20, 120);
        noStroke();
        circle(x, y, 4);
      }
    }
  }

  drawTrendline(filteredData, compareData.length > 0 ? color(220, 20, 20, 180) : color(150, 150, 150, 200));
  if (compareData.length > 1) {
    drawTrendline(compareData, color(60, 160, 60, 180));
  }

  if (hoveredPoint) {
    fill(compareData.length > 0 ? color(255, 0, 0) : color(25, 25, 25));
    noStroke();
    circle(hoveringPointX, hoveringPointY, 8);
  }
  if (hoveredComparePoint) {
    fill(20, 200, 20);
    noStroke();
    circle(hoveringCompareX, hoveringCompareY, 8);
  }

  pop();

  // Draw water animation on the right side
  drawWaterAnimation();

  if (hoveredPoint || hoveredComparePoint) {
    drawHoverBox(hoveredPoint, hoveredComparePoint);
  }

  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(18);
  let titleText = 'Sea Level Change Over Time - ' + selectedLocation;

  if (compareData.length > 0 && selectedCompare && selectedCompare !== 'None') {
    titleText += ' vs ' + selectedCompare;
  }
  text(titleText, width / 2, margin.top / 2 + 10);

  textSize(12);
  fill(100);
  let countText = filteredData.length + (compareData.length > 0 ? (' & ' + compareData.length) : '') + ' data points';
  text(countText, width / 2, margin.top / 2 + 35);

  waveOffset += 0.05;
}

function drawWaterAnimation() {
  let waterWidth = 120;
  let containerHeight = plotHeight;
  let containerY = margin.top;

  // Use hovered point if available, otherwise use average
  let mainChange = 0;
  if (hoveredPoint) {
    mainChange = hoveredPoint.change;
  } else if (filteredData.length > 0) {
    mainChange = filteredData.reduce((sum, d) => sum + d.change, 0) / filteredData.length;
  }

  if (compareData.length > 0) {
    // When comparing, stack vertically
    let waterX = width - 150;
    
    // Top container - main dataset
    let topContainerY = containerY;
    let topContainerHeight = containerHeight / 2 - 20;
    
    stroke(100);
    strokeWeight(2);
    noFill();
    rect(waterX, topContainerY, waterWidth, topContainerHeight);
    
    let waterY = map(mainChange, minY, maxY, topContainerY + topContainerHeight, topContainerY);
    
    push();
    fill(255, 0, 0, 150);
    noStroke();
    
    beginShape();
    for (let x = waterX; x <= waterX + waterWidth; x += 5) {
      let waveY = waterY + sin(waveOffset + x * 0.05) * 8;
      vertex(x, waveY);
    }
    vertex(waterX + waterWidth, topContainerY + topContainerHeight);
    vertex(waterX, topContainerY + topContainerHeight);
    endShape(CLOSE);
    pop();
    
    fill(0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(10);
    text(selectedLocation, waterX + waterWidth / 2, topContainerY - 10);
    text(mainChange.toFixed(1) + ' mm', waterX + waterWidth / 2, waterY - 15);
    
    // Bottom container - compare dataset
    let compareChange = 0;
    if (hoveredComparePoint) {
      compareChange = hoveredComparePoint.change;
    } else {
      compareChange = compareData.reduce((sum, d) => sum + d.change, 0) / compareData.length;
    }
    
    let bottomContainerY = containerY + containerHeight / 2 + 20;
    let bottomContainerHeight = containerHeight / 2 - 20;
    
    stroke(100);
    strokeWeight(2);
    noFill();
    rect(waterX, bottomContainerY, waterWidth, bottomContainerHeight);
    
    let compareWaterY = map(compareChange, minY, maxY, bottomContainerY + bottomContainerHeight, bottomContainerY);
    
    push();
    fill(20, 200, 20, 150);
    noStroke();
    
    beginShape();
    for (let x = waterX; x <= waterX + waterWidth; x += 5) {
      let waveY = compareWaterY + sin(waveOffset + x * 0.05 + PI) * 8;
      vertex(x, waveY);
    }
    vertex(waterX + waterWidth, bottomContainerY + bottomContainerHeight);
    vertex(waterX, bottomContainerY + bottomContainerHeight);
    endShape(CLOSE);
    pop();
    
    fill(0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(10);
    text(selectedCompare, waterX + waterWidth / 2, bottomContainerY - 10);
    text(compareChange.toFixed(1) + ' mm', waterX + waterWidth / 2, compareWaterY - 15);
    
  } else {
    // Single container when not comparing
    let waterX = width - 150;
    
    stroke(100);
    strokeWeight(2);
    noFill();
    rect(waterX, containerY, waterWidth, containerHeight);
    
    let waterY = map(mainChange, minY, maxY, containerY + containerHeight, containerY);
    
    push();
    fill(30, 144, 255, 150);
    noStroke();
    
    beginShape();
    for (let x = waterX; x <= waterX + waterWidth; x += 5) {
      let waveY = waterY + sin(waveOffset + x * 0.05) * 8;
      vertex(x, waveY);
    }
    vertex(waterX + waterWidth, containerY + containerHeight);
    vertex(waterX, containerY + containerHeight);
    endShape(CLOSE);
    pop();
    
    fill(0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(10);
    text(selectedLocation, waterX + waterWidth / 2, containerY - 10);
    text(mainChange.toFixed(1) + ' mm', waterX + waterWidth / 2, waterY - 15);
  }
}

function drawAxes() {
  stroke(0);
  strokeWeight(2);
  noFill();
  line(0, plotHeight, plotWidth, plotHeight);
  line(0, 0, 0, plotHeight);

  fill(0);
  noStroke();
  textAlign(RIGHT, CENTER);
  textSize(11);

  let yMin = Math.floor(minY / 10) * 10;
  let yMax = Math.ceil(maxY / 10) * 10;

  if (minY <= 0 && maxY >= 0) {
    let zeroY = map(0, minY, maxY, plotHeight, 0);
    stroke(0);
    strokeWeight(2);
    line(0, zeroY, plotWidth, zeroY);
  }

  for (let val = yMin; val <= yMax; val += 10) {
    let y = map(val, minY, maxY, plotHeight, 0);
    if (y >= 0 && y <= plotHeight) {
      let isMajorTick = (val % 50 === 0);
      stroke(0); strokeWeight(1);
      if (isMajorTick) {
        line(-8, y, 0, y);
      } else {
        line(-5, y, 0, y);
      }
      stroke(isMajorTick ? 150 : 220);
      strokeWeight(isMajorTick ? 0.8 : 0.3);
      line(0, y, plotWidth, y);

      if (isMajorTick) {
        fill(0); noStroke();
        text(val.toFixed(0), -12, y);
      }
    }
  }

  fill(0); noStroke();
  textAlign(CENTER, CENTER); textSize(14);
  push(); translate(-50, plotHeight / 2); rotate(-HALF_PI);
  text('Change in Mean (mm)', 0, 0); pop();
  text('Data Point Index', plotWidth / 2, plotHeight + 50);
  
  textSize(11);
  let numTimeLabels = 8;
  for (let i = 0; i <= numTimeLabels; i++) {
    let dataIndex = Math.floor(map(i, 0, numTimeLabels, 0, filteredData.length - 1));
    if (dataIndex >= 0 && dataIndex < filteredData.length) {
      let x = map(dataIndex, minX, maxX, 0, plotWidth);
      let dateObj = parseDate(filteredData[dataIndex].date);
      if (dateObj) {
        let month = dateObj.getMonth() + 1;
        let year = dateObj.getFullYear();
        text(month + '/' + year, x, plotHeight + 30);
      }
    }
  }
}

function drawHoverBox(pt1, pt2) {
  let boxWidth = 230;
  let boxHeight = pt1 && pt2 ? 170 : 85;
  let boxX = mouseX + 15;
  let boxY = mouseY - 10;

  if (boxX + boxWidth > width - 160) boxX = mouseX - boxWidth - 15;
  if (boxY + boxHeight > height - 10) boxY = height - boxHeight - 10;
  if (boxY < 10) boxY = 10;

  fill(255, 255, 255, 250); stroke(100); strokeWeight(1);
  rect(boxX, boxY, boxWidth, boxHeight, 5);

  fill(0); noStroke(); textAlign(LEFT, TOP); textSize(12);
  let textX = boxX + 10;
  let textY = boxY + 10;
  let lineHeight = 18;

  if(pt1 && pt2){
    text('Graph 1 (' + selectedLocation + '):', textX, textY);
    text('ID: ' + pt1.id, textX, textY + lineHeight);
    text('Date: ' + pt1.date.slice(1), textX, textY + lineHeight * 2);
    text('Change: ' + pt1.change.toFixed(2) + ' mm', textX, textY + lineHeight * 3);
    let offset = pt1 ? 4.5 : 0;
    text('Graph 2 (' + selectedCompare + '):', textX, textY + lineHeight * offset);
    text('ID: ' + pt2.id, textX, textY + lineHeight * (offset + 1));
    text('Date: ' + pt2.date.slice(1), textX, textY + lineHeight * (offset + 2));
    text('Change: ' + pt2.change.toFixed(2) + ' mm', textX, textY + lineHeight * (offset + 3));
  }
  else if(pt1){
    text(selectedLocation, textX, textY);
    text('ID: ' + pt1.id, textX, textY + lineHeight);
    text('Date: ' + pt1.date.slice(1), textX, textY + lineHeight * 2);
    text('Change: ' + pt1.change.toFixed(2) + ' mm', textX, textY + lineHeight * 3);
  }
}

function drawTrendline(data, lineColor) {
  if (data.length < 2) return;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  let n = data.length;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i].change;
    sumXY += i * data[i].change;
    sumXX += i * i;
  }
  let slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  let intercept = (sumY - slope * sumX) / n;

  let x1 = 0;
  let y1Value = intercept;
  let y1 = map(y1Value, minY, maxY, plotHeight, 0);

  let x2 = plotWidth;
  let y2Value = slope * (n - 1) + intercept;
  let y2 = map(y2Value, minY, maxY, plotHeight, 0);

  stroke(lineColor);
  strokeWeight(2);
  line(x1, y1, x2, y2);
  noStroke();
}
