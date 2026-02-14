# Génération PDF avec Puppeteer

## Vue d'ensemble

Le système utilise Puppeteer pour générer des documents PDF à partir de templates HTML. Puppeteer est une bibliothèque Node.js qui contrôle un navigateur Chromium headless pour générer des PDFs de haute qualité.

## Installation

```bash
npm install puppeteer
```

**Note**: Puppeteer télécharge automatiquement Chromium. Pour les environnements de production (comme Docker), il est recommandé d'utiliser `puppeteer-core` et de fournir un exécutable Chromium.

## Configuration

### Variables d'environnement

```
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true (si utilisation de puppeteer-core)
```

### Service PDF

Créer un service `pdfService.js` dans le dossier `services/` :

```javascript
// services/pdfService.js
const puppeteer = require('puppeteer');

class PDFService {
  async generatePDF(html, options = {}) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: options.format || 'A4',
        printBackground: true,
        margin: options.margin || {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
      
      return pdf;
    } finally {
      await browser.close();
    }
  }
}

module.exports = new PDFService();
```

## Routes PDF

### GET `/api/v1/lab/results/:id/pdf`
**Description**: Générer le PDF d'un résultat de laboratoire

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
- Content-Type: `application/pdf`
- Fichier PDF en téléchargement

**Logique**:
1. Récupérer le résultat de laboratoire complet
2. Récupérer les informations du patient
3. Récupérer les informations du médecin
4. Générer le HTML du résultat
5. Convertir en PDF avec Puppeteer
6. Retourner le PDF

### GET `/api/v1/imaging/requests/:id/pdf`
**Description**: Générer le PDF d'un résultat d'imagerie

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
- Content-Type: `application/pdf`
- Fichier PDF en téléchargement

### POST `/api/v1/pdf/generate`
**Description**: Route générique pour générer des PDFs

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "type": "lab_result|imaging_result|prescription|custom_item",
  "dataId": "uuid (required)",
  "options": {
    "format": "A4",
    "orientation": "portrait|landscape"
  }
}
```

**Réponse (200)**:
- Content-Type: `application/pdf`
- Fichier PDF en téléchargement

## Templates HTML

### Structure de base

Créer un dossier `templates/pdf/` pour les templates HTML :

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .patient-info {
      margin-bottom: 20px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 10px;
      border-bottom: 2px solid #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    table th, table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    table th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
  </style>
</head>
<body>
  <!-- Contenu du PDF -->
</body>
</html>
```

### Template Résultat Laboratoire

```html
<div class="header">
  <h1>VITALIS</h1>
  <h2>Centre Médical</h2>
</div>

<div class="patient-info">
  <table>
    <tr>
      <td><strong>Nom du patient:</strong> {{patientName}}</td>
      <td><strong>Âge:</strong> {{patientAge}} ans</td>
    </tr>
    <tr>
      <td><strong>ID Patient:</strong> {{vitalisId}}</td>
      <td><strong>N° Labo:</strong> {{labRequestId}}</td>
    </tr>
    <tr>
      <td><strong>Date de service:</strong> {{serviceDate}}</td>
      <td><strong>Demandé par:</strong> {{doctorName}}</td>
    </tr>
  </table>
</div>

{{#each sections}}
<div class="section">
  <div class="section-title">{{title}}</div>
  <table>
    <thead>
      <tr>
        <th>Analyse</th>
        <th>Résultat</th>
        <th>Unité</th>
        <th>Référence</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{name}}</td>
        <td>{{value}}</td>
        <td>{{unit}}</td>
        <td>{{reference}}</td>
        <td>{{status}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
</div>
{{/each}}

{{#if notes}}
<div class="section">
  <div class="section-title">Commentaire envoyé au labo</div>
  <p>{{notes}}</p>
</div>
{{/if}}

<div class="footer">
  <p>Document généré le {{generatedDate}}</p>
</div>
```

### Template Résultat Imagerie

```html
<div class="header">
  <h1>VITALIS</h1>
  <h2>Centre Médical</h2>
</div>

<div class="patient-info">
  <table>
    <tr>
      <td><strong>Nom du patient:</strong> {{patientName}}</td>
      <td><strong>Âge:</strong> {{patientAge}} ans</td>
    </tr>
    <tr>
      <td><strong>ID Patient:</strong> {{vitalisId}}</td>
      <td><strong>N° Imagerie:</strong> {{imagingRequestId}}</td>
    </tr>
    <tr>
      <td><strong>Date de service:</strong> {{serviceDate}}</td>
      <td><strong>Demandé par:</strong> {{doctorName}}</td>
    </tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Examens demandés</div>
  <ul>
    {{#each exams}}
    <li>{{name}} - {{category}}</li>
    {{/each}}
  </ul>
</div>

<div class="section">
  <div class="section-title">Résultats</div>
  <p>{{results}}</p>
</div>

<div class="footer">
  <p>Document généré le {{generatedDate}}</p>
</div>
```

### Template Ordonnance

```html
<div class="header">
  <h1>VITALIS</h1>
  <h2>Centre Médical</h2>
  <h3>ORDONNANCE MÉDICALE</h3>
</div>

<div class="patient-info">
  <table>
    <tr>
      <td><strong>Nom du patient:</strong> {{patientName}}</td>
      <td><strong>Âge:</strong> {{patientAge}} ans</td>
    </tr>
    <tr>
      <td><strong>ID Patient:</strong> {{vitalisId}}</td>
      <td><strong>Date:</strong> {{prescriptionDate}}</td>
    </tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Médicaments prescrits</div>
  <table>
    <thead>
      <tr>
        <th>Médicament</th>
        <th>Dosage</th>
        <th>Fréquence</th>
        <th>Durée</th>
        <th>Quantité</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{medication}}</td>
        <td>{{dosage}}</td>
        <td>{{frequency}}</td>
        <td>{{duration}}</td>
        <td>{{quantity}}</td>
      </tr>
      {{#if instructions}}
      <tr>
        <td colspan="5"><em>Instructions: {{instructions}}</em></td>
      </tr>
      {{/if}}
      {{/each}}
    </tbody>
  </table>
</div>

{{#if notes}}
<div class="section">
  <div class="section-title">Notes</div>
  <p>{{notes}}</p>
</div>
{{/if}}

<div class="footer">
  <p>Prescrit par: {{doctorName}}</p>
  <p>Document généré le {{generatedDate}}</p>
</div>
```

### Template Item Personnalisé

```html
<div class="header">
  <h1>VITALIS</h1>
  <h2>Centre Médical</h2>
</div>

<div class="patient-info">
  <table>
    <tr>
      <td><strong>Nom du patient:</strong> {{patientName}}</td>
      <td><strong>ID Patient:</strong> {{vitalisId}}</td>
    </tr>
    <tr>
      <td><strong>Date:</strong> {{itemDate}}</td>
      <td><strong>Médecin:</strong> {{doctorName}}</td>
    </tr>
  </table>
</div>

<div class="section">
  <div class="section-title">{{itemName}}</div>
  <p>{{description}}</p>
</div>

<div class="footer">
  <p>Document généré le {{generatedDate}}</p>
</div>
```

## Utilisation du Service

### Exemple dans un Controller

```javascript
const pdfService = require('../services/pdfService');
const { renderTemplate } = require('../utils/templateEngine');

async function generateLabResultPDF(req, res) {
  try {
    // Récupérer les données
    const labResult = await LabResult.findByPk(req.params.id, {
      include: [
        { model: LabRequest, include: [Patient, User] }
      ]
    });
    
    // Générer le HTML
    const html = renderTemplate('lab-result', {
      patientName: `${labResult.LabRequest.Patient.firstName} ${labResult.LabRequest.Patient.lastName}`,
      patientAge: calculateAge(labResult.LabRequest.Patient.dateOfBirth),
      vitalisId: labResult.LabRequest.Patient.vitalisId,
      labRequestId: labResult.labRequestId,
      serviceDate: formatDate(labResult.LabRequest.createdAt),
      doctorName: labResult.LabRequest.User.name,
      sections: labResult.results.sections,
      notes: labResult.LabRequest.notes,
      generatedDate: formatDate(new Date())
    });
    
    // Générer le PDF
    const pdf = await pdfService.generatePDF(html);
    
    // Retourner le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resultat-lab-${labResult.id}.pdf"`);
    res.send(pdf);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du PDF'
    });
  }
}
```

## Moteur de Templates

Utiliser un moteur de templates comme Handlebars ou EJS :

```bash
npm install handlebars
```

```javascript
// utils/templateEngine.js
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

function renderTemplate(templateName, data) {
  const templatePath = path.join(__dirname, `../templates/pdf/${templateName}.html`);
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const template = handlebars.compile(templateContent);
  return template(data);
}

module.exports = { renderTemplate };
```

## Optimisations

### Cache des Templates
- Compiler les templates une seule fois au démarrage
- Mettre en cache les templates compilés

### Performance
- Utiliser un pool de navigateurs Puppeteer
- Réutiliser les instances de navigateur
- Limiter le nombre de pages ouvertes simultanément

### Gestion des Erreurs
- Gérer les timeouts
- Nettoyer les ressources en cas d'erreur
- Logger les erreurs de génération

## Sécurité

- Valider les données avant génération
- Sanitizer le HTML pour éviter les injections
- Limiter la taille des données
- Vérifier les permissions avant génération
