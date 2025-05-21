# WebGIS Application User Documentation

## Overview

This WebGIS application allows you to read, edit, and view GIS data from ArcGIS Pro formats (GDB, SHP, Feature Classes) and provides functionality to input WMTS layers. The application features a minimal and user-friendly interface designed for internal use.

## Features

- **Google Authentication**: Secure access to the application
- **GIS Data Support**: Read and process GDB, SHP, and Feature Class formats
- **Layer Management**: Create and manage different layer types (point, polyline, line, area)
- **Geometry Editing**: Edit geometries, add fields, and modify data
- **WMTS Integration**: Add and display WMTS layers
- **Data Storage**: Save and manage your GIS data

## Installation Instructions

### Prerequisites

- Python 3.8 or higher
- GDAL library installed on your system
- Git (optional, for cloning the repository)

### Setup Steps

1. **Clone or download the repository**

   ```bash
   git clone <repository-url>
   cd webgis_app
   ```

2. **Create and activate a virtual environment**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Google OAuth**

   Edit `src/main.py` and replace the placeholder values with your Google OAuth credentials:

   ```python
   app.config["GOOGLE_OAUTH_CLIENT_ID"] = "YOUR_GOOGLE_CLIENT_ID"
   app.config["GOOGLE_OAUTH_CLIENT_SECRET"] = "YOUR_GOOGLE_CLIENT_SECRET"
   ```

   To obtain these credentials:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Navigate to "APIs & Services" > "Credentials"
   - Create an OAuth 2.0 Client ID
   - Add authorized redirect URIs (e.g., http://localhost:5000/login/google/authorized)

5. **Run the application**

   ```bash
   cd src
   FLASK_APP=main.py flask run --host=0.0.0.0 --port=5000
   ```

6. **Access the application**

   Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

## Using the Application

### Authentication

1. Open the application in your browser
2. Click "Sign in with Google"
3. Complete the Google authentication process

### Adding GIS Data

1. Click "Add Data" in the top navigation bar
2. Select a GIS file (Shapefile, File Geodatabase, or Feature Class)
3. Click "Upload"

### Creating New Layers

1. Click "Create Layer" in the top navigation bar
2. Select the layer type (Point, Line, or Polygon)
3. Enter a name for the layer
4. Add fields as needed
5. Click "Create"

### Adding WMTS Layers

1. Click "Add WMTS" in the top navigation bar
2. Enter the WMTS URL and layer name
3. Click "Add Layer"

### Editing Features

1. Select a layer from the sidebar
2. Use the editing tools:
   - Select: Click on features to select them
   - Draw: Create new features
   - Edit Geometry: Modify feature shapes
   - Delete: Remove features
3. Edit attributes by selecting a feature and clicking "Edit Attributes"
4. Add new fields by clicking "Add Field"

## Troubleshooting

### Common Issues

- **File upload errors**: Ensure your file is in a supported format (SHP, GDB, Feature Class)
- **WMTS connection issues**: Verify the WMTS URL is correct and accessible
- **Authentication problems**: Check that your Google OAuth credentials are correctly configured

### Support

For additional support, please contact your system administrator.

## Technical Details

- **Backend**: Flask (Python)
- **Authentication**: Google OAuth via Flask-Dance
- **GIS Processing**: GeoPandas, GDAL
- **Frontend**: Leaflet.js, Bootstrap
- **Map Rendering**: Leaflet with custom controls

## Data Security

- All data is processed locally within the application
- Authentication is handled securely through Google OAuth
- No data is sent to external services unless explicitly configured (e.g., WMTS)
