import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { kml } from '@tmcw/togeojson';

// Main App component
const KMLMapViewer = () => {
  const [kmlContent, setKmlContent] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [elementSummary, setElementSummary] = useState(null);
  const [detailedView, setDetailedView] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);
  const fileInputRef = useRef(null);

  // Function to handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const kmlString = e.target.result;
      setKmlContent(kmlString);
      
      // Parse KML to GeoJSON
      const parser = new DOMParser();
      const kmlDoc = parser.parseFromString(kmlString, 'text/xml');
      const geoJson = kml(kmlDoc);
      setGeoJsonData(geoJson);
      
      // Calculate summaries
      calculateSummaries(geoJson);
    };
    reader.readAsText(file);
  };

  // Function to calculate summary and detailed information
  const calculateSummaries = (geoJson) => {
    if (!geoJson || !geoJson.features) return;

    // Count different element types
    const elementCounts = {};
    const lengthByType = {};
    
    geoJson.features.forEach(feature => {
      const type = feature.geometry.type;
      
      // Count elements
      elementCounts[type] = (elementCounts[type] || 0) + 1;
      
      // Calculate length for line elements
      if (type === 'LineString' || type === 'MultiLineString') {
        lengthByType[type] = lengthByType[type] || { count: 0, totalLength: 0 };
        lengthByType[type].count += 1;
        
        let length = 0;
        if (type === 'LineString') {
          length = calculateLineLength(feature.geometry.coordinates);
        } else if (type === 'MultiLineString') {
          feature.geometry.coordinates.forEach(line => {
            length += calculateLineLength(line);
          });
        }
        
        lengthByType[type].totalLength += length;
      }
    });
    
    setElementSummary(elementCounts);
    setDetailedView(lengthByType);
  };

  // Function to calculate line length in kilometers using Haversine formula
  const calculateLineLength = (coordinates) => {
    let totalLength = 0;
    
    for (let i = 1; i < coordinates.length; i++) {
      const prevPoint = coordinates[i - 1];
      const currentPoint = coordinates[i];
      
      // Calculate distance between consecutive points
      const distance = calculateDistance(
        prevPoint[1], prevPoint[0], 
        currentPoint[1], currentPoint[0]
      );
      
      totalLength += distance;
    }
    
    return totalLength;
  };

  // Haversine formula to calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance;
  };

  // Function to toggle summary view
  const toggleSummary = () => {
    setShowSummary(!showSummary);
    if (showSummary) setShowDetailed(false);
  };

  // Function to toggle detailed view
  const toggleDetailed = () => {
    setShowDetailed(!showDetailed);
    if (showDetailed) setShowSummary(false);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">KML Map Viewer</h1>
      
      <div className="mb-6">
        <label className="block mb-2 font-medium">
          Upload KML File:
          <input
            type="file"
            accept=".kml"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="block w-full mt-1 p-2 border rounded"
          />
        </label>
      </div>
      
      {geoJsonData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="h-96 border rounded overflow-hidden">
              <MapContainer 
                center={[0, 0]} 
                zoom={2} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {geoJsonData && <GeoJSON data={geoJsonData} />}
              </MapContainer>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <button 
                onClick={toggleSummary}
                className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
              >
                {showSummary ? 'Hide Summary' : 'Show Summary'}
              </button>
              
              <button
                onClick={toggleDetailed}
                className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
              >
                {showDetailed ? 'Hide Detailed View' : 'Show Detailed View'}
              </button>
            </div>
            
            {showSummary && elementSummary && (
              <div className="bg-gray-100 p-4 rounded">
                <h2 className="text-lg font-semibold mb-2">Element Summary</h2>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2 text-left">Element Type</th>
                      <th className="border p-2 text-left">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(elementSummary).map(([type, count]) => (
                      <tr key={type}>
                        <td className="border p-2">{type}</td>
                        <td className="border p-2">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {showDetailed && detailedView && (
              <div className="bg-gray-100 p-4 rounded">
                <h2 className="text-lg font-semibold mb-2">Detailed View</h2>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2 text-left">Element Type</th>
                      <th className="border p-2 text-left">Count</th>
                      <th className="border p-2 text-left">Total Length (km)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(detailedView).map(([type, data]) => (
                      <tr key={type}>
                        <td className="border p-2">{type}</td>
                        <td className="border p-2">{data.count}</td>
                        <td className="border p-2">{data.totalLength.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KMLMapViewer;
