import { createPortal } from "react-dom";
import React from "react";

interface ModalPortalProps {
  children: React.ReactNode;
}

const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  const root = document.getElementById("modal-root") || document.body;
  return createPortal(children, root);
};

export default ModalPortal;
