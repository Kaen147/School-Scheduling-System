import Swal from "sweetalert2";

export const showPDFOptionsModal = async () => {
  const { value: pdfOptions } = await Swal.fire({
    title: "PDF Export Options",
    html: `
      <div style="text-align: left; padding: 1rem;">
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Page Orientation:</label>
          <select id="pdf-orientation" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            <option value="portrait">Portrait (1 page)</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Paper Size:</label>
          <select id="pdf-size" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            <option value="a4">A4 (210 x 297 mm)</option>
            <option value="letter">Letter (8.5 x 11 in)</option>
            <option value="legal">Legal (8.5 x 14 in)</option>
            <option value="a3">A3 (297 x 420 mm)</option>
          </select>
        </div>

        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Quality:</label>
          <select id="pdf-quality" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            <option value="2">High Quality</option>
            <option value="1.5">Medium Quality</option>
            <option value="1">Standard Quality</option>
          </select>
        </div>

        <div style="background-color: #f0f9ff; padding: 0.75rem; border-radius: 4px; border-left: 4px solid #3B82F6;">
          <p style="margin: 0; font-size: 0.875rem; color: #1e40af;">
            <strong>Tip:</strong> Portrait orientation fits on 1 A4 sheet but may have smaller text. Landscape provides better readability.
          </p>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Generate PDF",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#3B82F6",
    cancelButtonColor: "#6B7280",
    width: "500px",
    preConfirm: () => {
      return {
        orientation: document.getElementById("pdf-orientation").value,
        size: document.getElementById("pdf-size").value,
        quality: parseFloat(document.getElementById("pdf-quality").value),
      };
    },
  });

  return pdfOptions;
};

export const showPDFGeneratingModal = () => {
  Swal.fire({
    title: "Generating PDF...",
    html: "Creating your schedule PDF. This may take a moment...",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

export const showPDFSuccessModal = () => {
  Swal.fire({
    icon: "success",
    title: "PDF Downloaded!",
    text: "Your schedule has been saved as a PDF file.",
    timer: 2000,
    showConfirmButton: false,
  });
};

export const showPDFErrorModal = () => {
  Swal.fire({
    icon: "error",
    title: "PDF Generation Failed",
    text: "There was an error creating the PDF. Please try again.",
    confirmButtonColor: "#3B82F6",
  });
};