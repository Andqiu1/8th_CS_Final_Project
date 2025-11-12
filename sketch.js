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
let selectedLocation = 'World';  // default to World
let selectedCompare = null;
let hoveringPointX, hoveringPointY;
let hoveringCompareX, hoveringCompareY;

function preload() {
  table = loadTable('Sea_Levels_NOAA.csv', 'csv', 'header');
}

function setup() {
  createCanvas(1200, 700);
  plotWidth = width - margin.left - margin.right;
  plotHeight = height - margin.top - margin.bottom;

  // Parse the CSV data
  for (let i = 0; i < table.getRowCount(); i++) {
    let row = table.getRow(i);
    allData.push({
      id: row.getNum('ObjectId'),
      measure: row.getString('Measure'),
      date: row.getString('Date'),
      change: row.getNum('Change in Mean (mm)')
    });
  }

  let locationSet = new Set([
    'World', 'Adriatic Sea', 'Andaman Sea', 'Arabian Sea', 'Atlantic Ocean', 
    'Baltic Sea', 'Bay Bengal', 'Bering Sea', 'Caribbean Sea', 'Gulf Mexico', 
    'Indian Ocean', 'Indonesian', 'Mediterranean', 'Nino', 'North Atlantic', 
    'North Pacific', 'North Sea', 'Pacific Ocean', 'Persian Gulf', 'Sea Japan',
    'Sea Okhotsk', 'South China', 'Southern Ocean', 'Tropics', 'Yellow Sea'
  ]);

  // Remove "World", sort, then add "World" at front
  let locationsArray = Array.from(locationSet);
  locationsArray = locationsArray.filter(l => l.toLowerCase() !== "world");
  locationsArray = locationsArray.sort();
  allLocations = ["World", ...locationsArray];

  // Search input
  searchInput = createInput('');
  searchInput.position(20, 20);
  searchInput.size(200);
  searchInput.attribute('placeholder', 'Search location...');
  searchInput.input(filterLocations);

  // Location dropdown
  locationDropdown = createSelect();
  locationDropdown.position(230, 20);
  locationDropdown.size(250);
  updateDropdownOptions(locationDropdown, allLocations, selectedLocation);
  locationDropdown.changed(updateLocation);

  // Compare search input
  compareSearchInput = createInput('');
  compareSearchInput.position(500, 20);
  compareSearchInput.size(200);
  compareSearchInput.attribute('placeholder', 'Search comparison...');
  compareSearchInput.input(filterCompareLocations);

  // Compare dropdown
  compareDropdown = createSelect();
  compareDropdown.position(710, 20);
  compareDropdown.size(250);
  updateDropdownOptions(compareDropdown, ['None', ...allLocations.filter(l => l !== selectedLocation)], selectedCompare || 'None');
  compareDropdown.changed(updateCompare);

  // Initialize with "World" data
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
  // Set selected value if it exists in filtered list
  if (locations.includes(selected)) {
    dropdown.value(selected);
  } else if (dropdown === compareDropdown && locations.length > 0) {
    dropdown.value('None');
  }
}

function updateLocation() {
  selectedLocation = locationDropdown.value();

  // Update compare dropdown to not show the same location
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

  // ---- MAIN DATASET ----
  for (let i = 0; i < filteredData.length; i++) {
    let x = map(i, minX, maxX, 0, plotWidth);
    let y = map(filteredData[i].change, minY, maxY, plotHeight, 0);

    // If comparing, use explicit color; else use original style
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
      // Original color mapping, varies by 'change'
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

  // ---- COMPARE DATASET ----
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
}

function drawHoverBox(pt1, pt2) {
  let boxWidth = 230;
  let boxHeight = pt1 && pt2 ? 170 : 85;
  let boxX = mouseX + 15;
  let boxY = mouseY - 10;

  if (boxX + boxWidth > width - 10) boxX = mouseX - boxWidth - 15;
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
