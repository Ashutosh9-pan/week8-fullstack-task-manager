describe("TaskFlow authentication flow", () => {
  it("validates empty login form and navigates to registration", () => {
    cy.visit("/login");

    cy.contains("Sign In").click();

    cy.contains("Email is required").should("be.visible");
    cy.contains("Password is required").should("be.visible");

    cy.contains("Create one").click();
    cy.location("pathname").should("eq", "/register");
    cy.contains("Create account").should("be.visible");
  });
});
