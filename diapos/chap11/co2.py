import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Get data
co2 = np.genfromtxt("ftp://aftp.cmdl.noaa.gov/products/trends/co2/co2_mm_mlo.txt")

# Interpolate missing values
missing = co2[:, 3] < 0
co2[missing, 3] = np.interp(co2[missing, 2], co2[~missing, 2], co2[~missing, 3])

# Plot it!
plt.rcParams["axes.labelsize"] = 16
plt.rcParams["xtick.labelsize"] = 14
plt.rcParams["ytick.labelsize"] = 14
fig, ax = plt.subplots()
ax.fill_between(co2[:, 2], co2[:, 3], alpha=0.4)
ax.plot(co2[:, 2], co2[:, 3], lw=3)
ax.set_ylim((0, 450))
ax.set_xlim((1959, 2014))
ax.set_xlabel("Année")
ax.set_ylabel("Dioxide de carbone (ppm)")
plt.tight_layout()

plt.savefig("co2.png")
